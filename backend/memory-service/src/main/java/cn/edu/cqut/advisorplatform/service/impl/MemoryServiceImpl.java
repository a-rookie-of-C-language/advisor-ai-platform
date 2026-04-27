package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.memoryservice.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.MemoryTaskDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.SessionSummaryDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateItemDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemoryTaskSubmitDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryItemResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryTaskResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.MemoryTaskDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.SessionSummaryDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.MemoryService;
import cn.edu.cqut.advisorplatform.service.vector.EmbeddingService;
import cn.edu.cqut.advisorplatform.service.vector.MemoryServiceFactory;
import cn.edu.cqut.advisorplatform.service.vector.MemoryVectorService;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

  private final UserMemoryDao userMemoryDao;
  private final MemoryTaskDao memoryTaskDao;
  private final SessionSummaryDao sessionSummaryDao;
  private final ChatSessionDao chatSessionDao;
  private final MemoryServiceFactory memoryServiceFactory;
  private final EmbeddingService embeddingService;

  @Value("${advisor.memory.vector-store:pgvector}")
  private String vectorStore;

  @Value("${advisor.memory.hybrid.vector-weight:0.7}")
  private double hybridVectorWeight;

  @Value("${advisor.memory.hybrid.text-weight:0.3}")
  private double hybridTextWeight;

  @Override
  public List<MemoryItemResponseDTO> searchLongTerm(MemorySearchRequestDTO request) {
    long startedAt = System.currentTimeMillis();
    int topK = request.getTopK() == null ? 6 : Math.max(1, Math.min(request.getTopK(), 50));
    String query = Optional.ofNullable(request.getQuery()).orElse("").trim();
    String mode = Optional.ofNullable(request.getMode()).orElse("hybrid").toLowerCase();
    List<UserMemoryDO> rows;

    boolean hasVectorService = !query.isEmpty() && memoryServiceFactory.hasService(vectorStore);

    if ("vector".equals(mode) && hasVectorService) {
      rows = searchByVector(request, topK);
    } else if ("text".equals(mode)) {
      rows = searchText(request, query, topK);
    } else if (hasVectorService) {
      rows = searchHybrid(request, query, topK);
    } else {
      rows = searchText(request, query, topK);
    }

    recordAccessHits(rows);

    log.info(
        "memory_search_done userId={}, kbId={}, topK={}, mode={}, resultCount={}, elapsedMs={}",
        request.getUserId(),
        request.getKbId(),
        topK,
        mode,
        rows.size(),
        System.currentTimeMillis() - startedAt);

    return rows.stream().map(MemoryItemResponseDTO::from).toList();
  }

  private void recordAccessHits(List<UserMemoryDO> rows) {
    if (rows.isEmpty()) {
      return;
    }
    List<Long> ids = rows.stream().map(UserMemoryDO::getId).toList();
    for (Long id : ids) {
      userMemoryDao.incrementAccessCount(id);
    }
  }

  private List<UserMemoryDO> searchByVector(MemorySearchRequestDTO request, int topK) {
    try {
      MemoryVectorService vectorService = memoryServiceFactory.getService(vectorStore);
      double[] queryEmbedding = embeddingService.embed(request.getQuery());
      return vectorService.search(request.getUserId(), request.getKbId(), queryEmbedding, topK);
    } catch (Exception exc) {
      log.warn(
          "memory_vector_search_failed userId={}, kbId={}, err={}",
          request.getUserId(),
          request.getKbId(),
          exc.getMessage());
      return searchText(request, request.getQuery(), topK);
    }
  }

  private List<UserMemoryDO> searchText(MemorySearchRequestDTO request, String query, int topK) {
    return userMemoryDao.searchByScope(
        request.getUserId(),
        request.getKbId(),
        query,
        LocalDateTime.now(),
        PageRequest.of(0, topK));
  }

  private List<UserMemoryDO> searchHybrid(MemorySearchRequestDTO request, String query, int topK) {
    int recallK = Math.min(topK * 3, 50);

    List<UserMemoryDO> vectorResults;
    try {
      MemoryVectorService vectorService = memoryServiceFactory.getService(vectorStore);
      double[] queryEmbedding = embeddingService.embed(query);
      vectorResults =
          vectorService.search(request.getUserId(), request.getKbId(), queryEmbedding, recallK);
    } catch (Exception exc) {
      log.warn(
          "memory_hybrid_vector_fallback userId={}, kbId={}",
          request.getUserId(),
          request.getKbId());
      return searchText(request, query, topK);
    }

    List<UserMemoryDO> textResults =
        userMemoryDao.searchByScope(
            request.getUserId(),
            request.getKbId(),
            query,
            LocalDateTime.now(),
            PageRequest.of(0, recallK));

    return mergeHybridResults(vectorResults, textResults, topK);
  }

  private List<UserMemoryDO> mergeHybridResults(
      List<UserMemoryDO> vectorResults, List<UserMemoryDO> textResults, int topK) {
    Map<Long, Double> vectorScores = new LinkedHashMap<>();
    for (int i = 0; i < vectorResults.size(); i++) {
      UserMemoryDO item = vectorResults.get(i);
      double rankScore = 1.0 - ((double) i / Math.max(vectorResults.size(), 1));
      vectorScores.merge(item.getId(), rankScore, Math::max);
    }

    Map<Long, Double> textScores = new LinkedHashMap<>();
    for (int i = 0; i < textResults.size(); i++) {
      UserMemoryDO item = textResults.get(i);
      double rankScore = 1.0 - ((double) i / Math.max(textResults.size(), 1));
      textScores.merge(item.getId(), rankScore, Math::max);
    }

    Set<Long> allIds = new LinkedHashSet<>();
    vectorResults.forEach(item -> allIds.add(item.getId()));
    textResults.forEach(item -> allIds.add(item.getId()));

    Map<Long, UserMemoryDO> allItemsMap = new LinkedHashMap<>();
    for (UserMemoryDO item : vectorResults) {
      allItemsMap.putIfAbsent(item.getId(), item);
    }
    for (UserMemoryDO item : textResults) {
      allItemsMap.putIfAbsent(item.getId(), item);
    }

    List<Map.Entry<Long, Double>> fused =
        allIds.stream()
            .map(
                id -> {
                  double vScore = vectorScores.getOrDefault(id, 0.0);
                  double tScore = textScores.getOrDefault(id, 0.0);
                  double fusedScore = hybridVectorWeight * vScore + hybridTextWeight * tScore;
                  return Map.entry(id, fusedScore);
                })
            .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
            .limit(topK)
            .toList();

    return fused.stream()
        .map(entry -> allItemsMap.get(entry.getKey()))
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public MemoryCandidateUpsertResponseDTO upsertCandidates(
      MemoryCandidateUpsertRequestDTO request) {
    long startedAt = System.currentTimeMillis();
    List<MemoryCandidateItemDTO> candidates = request.getCandidates();
    if (candidates == null || candidates.isEmpty()) {
      return MemoryCandidateUpsertResponseDTO.of(0, 0, "no_candidates");
    }

    MemoryVectorService vectorService =
        memoryServiceFactory.hasService(vectorStore)
            ? memoryServiceFactory.getService(vectorStore)
            : null;

    int accepted = 0;
    int rejected = 0;
    for (MemoryCandidateItemDTO candidate : candidates) {
      if (candidate == null
          || candidate.getContent() == null
          || candidate.getContent().trim().isEmpty()) {
        rejected++;
        continue;
      }

      String normalizedContent = candidate.getContent().trim();
      BigDecimal confidence = toDecimal(candidate.getConfidence(), 0.7d, 3);

      try {
        UserMemoryDO row;
        double[] embedding = embeddingService.embed(normalizedContent);
        if (vectorService != null) {
          Optional<UserMemoryDO> similar =
              vectorService.findSimilar(request.getUserId(), request.getKbId(), embedding, 0.85d);
          if (similar.isPresent()) {
            row = similar.get();
            row.setContent(normalizedContent);
            row.setConfidence(row.getConfidence().max(confidence));
            row.setMemoryKey(extractMemoryKey(candidate.getTags()));
            row.setSourceTurnId(candidate.getSourceTurnId());
            row.setTags(candidate.getTags() == null ? new HashMap<>() : candidate.getTags());
            row.setUpdatedAt(LocalDateTime.now());
            row = userMemoryDao.save(row);
            vectorService.updateEmbedding(row.getId(), embedding);
            accepted++;
            continue;
          }
        }

        row = new UserMemoryDO();
        row.setUserId(request.getUserId());
        row.setKbId(request.getKbId());
        row.setContent(normalizedContent);
        row.setConfidence(confidence);
        row.setScore(BigDecimal.ZERO.setScale(4));
        row.setMemoryKey(extractMemoryKey(candidate.getTags()));
        row.setSourceTurnId(candidate.getSourceTurnId());
        row.setTags(candidate.getTags() == null ? new HashMap<>() : candidate.getTags());
        row.setIsDeleted(false);
        row.setCreatedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        row = userMemoryDao.save(row);
        if (vectorService != null) {
          vectorService.updateEmbedding(row.getId(), embedding);
        }
        accepted++;
      } catch (Exception exc) {
        log.warn(
            "memory_write_failed userId={}, kbId={}, err={}",
            request.getUserId(),
            request.getKbId(),
            exc.getMessage());
        rejected++;
      }
    }

    log.info(
        "memory_write_done userId={}, kbId={}, accepted={}, rejected={}, elapsedMs={}",
        request.getUserId(),
        request.getKbId(),
        accepted,
        rejected,
        System.currentTimeMillis() - startedAt);

    return MemoryCandidateUpsertResponseDTO.of(accepted, rejected, "ok");
  }

  @Override
  public SessionSummaryResponseDTO getSessionSummary(Long sessionId) {
    chatSessionDao
        .findById(sessionId)
        .orElseThrow(() -> new NotFoundException("session not found"));

    return sessionSummaryDao
        .findBySessionId(sessionId)
        .map(SessionSummaryResponseDTO::from)
        .orElse(null);
  }

  @Override
  @Transactional
  public void saveSessionSummary(Long sessionId, SessionSummaryUpdateRequestDTO request) {
    Assert.notBlank(request.getSummary(), () -> new BadRequestException("summary is blank"));

    ChatSessionDO session =
        chatSessionDao
            .findById(sessionId)
            .orElseThrow(() -> new NotFoundException("session not found"));

    SessionSummaryDO summary =
        sessionSummaryDao
            .findBySessionId(sessionId)
            .orElseGet(
                () -> {
                  SessionSummaryDO row = new SessionSummaryDO();
                  row.setSession(session);
                  row.setVersion(1);
                  row.setCreatedAt(LocalDateTime.now());
                  return row;
                });

    if (summary.getId() != null) {
      summary.setVersion(summary.getVersion() + 1);
    }
    summary.setSummary(request.getSummary().trim());
    summary.setUpdatedAt(LocalDateTime.now());
    sessionSummaryDao.save(summary);
  }

  @Override
  public void healthCheck() {
    // no-op
  }

  @Override
  @Transactional
  public Map<String, Integer> cleanupExpiredMemories() {
    int softDeleted = 0;
    int lowConfidence = 0;

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime softDeleteCutoff = now.minusDays(30);
    LocalDateTime staleCutoff = now.minusDays(90);

    List<UserMemoryDO> softDeletedRows = userMemoryDao.findSoftDeletedBefore(softDeleteCutoff);
    if (!softDeletedRows.isEmpty()) {
      List<Long> ids = softDeletedRows.stream().map(UserMemoryDO::getId).toList();
      userMemoryDao.deleteAllByIdInBatch(ids);
      softDeleted = ids.size();
    }

    List<UserMemoryDO> staleRows =
        userMemoryDao.findLowConfidenceStale(
            BigDecimal.valueOf(0.3), staleCutoff, PageRequest.of(0, 200));
    if (!staleRows.isEmpty()) {
      List<Long> ids = staleRows.stream().map(UserMemoryDO::getId).toList();
      userMemoryDao.deleteAllByIdInBatch(ids);
      lowConfidence = ids.size();
    }

    log.info("memory_cleanup_done soft_deleted={}, low_confidence={}", softDeleted, lowConfidence);

    return Map.of("soft_deleted", softDeleted, "low_confidence", lowConfidence);
  }

  private String extractMemoryKey(Map<String, Object> tags) {
    if (tags == null) {
      return null;
    }
    Object raw = tags.get("memory_key");
    if (raw == null) {
      return null;
    }
    String value = String.valueOf(raw).trim();
    return value.isEmpty() ? null : value;
  }

  private BigDecimal toDecimal(Double value, double fallback, int scale) {
    double safe = value == null ? fallback : Math.max(0d, Math.min(1d, value));
    return BigDecimal.valueOf(safe).setScale(scale, java.math.RoundingMode.HALF_UP);
  }

  @Override
  @Transactional
  public MemoryTaskResponseDTO submitTask(MemoryTaskSubmitDTO request) {
    var existing =
        memoryTaskDao.findBySessionIdAndTurnId(request.getSessionId(), request.getTurnId());
    if (existing.isPresent()) {
      return MemoryTaskResponseDTO.from(existing.get());
    }
    var task = new MemoryTaskDO();
    task.setUserId(request.getUserId());
    task.setKbId(request.getKbId());
    task.setSessionId(request.getSessionId());
    task.setTurnId(request.getTurnId());
    task.setStatus("pending");
    Map<String, Object> payload = new HashMap<>();
    if (request.getUserText() != null) payload.put("user_text", request.getUserText());
    if (request.getAssistantText() != null)
      payload.put("assistant_text", request.getAssistantText());
    if (request.getRecentMessages() != null)
      payload.put("recent_messages", request.getRecentMessages());
    task.setPayload(payload);
    task.setRetryCount(0);
    task.setCreatedAt(LocalDateTime.now());
    return MemoryTaskResponseDTO.from(memoryTaskDao.save(task));
  }

  @Override
  public List<MemoryTaskResponseDTO> fetchPendingTasks(int limit) {
    int safeLimit = Math.max(1, Math.min(limit, 50));
    List<MemoryTaskDO> tasks = memoryTaskDao.findPendingTasks(3, PageRequest.of(0, safeLimit));
    for (MemoryTaskDO task : tasks) {
      memoryTaskDao.updateStatus(task.getId(), "processing");
    }
    return tasks.stream().map(MemoryTaskResponseDTO::from).toList();
  }

  @Override
  @Transactional
  public void markTaskDone(Long taskId) {
    memoryTaskDao.updateStatus(taskId, "done");
  }

  @Override
  @Transactional
  public void markTaskFailed(Long taskId, String error) {
    memoryTaskDao.markFailed(taskId, error != null ? error : "unknown", LocalDateTime.now());
  }
}
