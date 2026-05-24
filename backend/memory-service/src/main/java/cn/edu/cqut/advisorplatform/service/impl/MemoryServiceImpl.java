package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemoryTaskSubmitDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryItemResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryTaskResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.memoryservice.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.MemoryTaskDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.SessionSummaryDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.memoryservice.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.MemoryTaskDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.SessionSummaryDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import cn.edu.cqut.advisorplatform.service.MemoryService;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
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
  private final MemorySearchSupport memorySearchSupport;
  private final MemoryCandidateUpsertSupport memoryCandidateUpsertSupport;

  @Value("${advisor.memory.vector-store:pgvector}")
  private String vectorStore;

  @Value("${advisor.memory.hybrid.vector-weight:0.7}")
  private double hybridVectorWeight;

  @Value("${advisor.memory.hybrid.text-weight:0.3}")
  private double hybridTextWeight;

  @Override
  @Transactional
  public List<MemoryItemResponseDTO> searchLongTerm(MemorySearchRequestDTO request) {
    long startedAt = System.currentTimeMillis();
    int topK = request.getTopK() == null ? 6 : Math.max(1, Math.min(request.getTopK(), 50));
    String query = Optional.ofNullable(request.getQuery()).orElse("").trim();
    String mode = Optional.ofNullable(request.getMode()).orElse("hybrid").toLowerCase();
    List<UserMemoryDO> rows =
        memorySearchSupport.search(
            request, topK, query, mode, vectorStore, hybridVectorWeight, hybridTextWeight);

    memorySearchSupport.recordAccessHits(rows);

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

  @Override
  public MemoryCandidateUpsertResponseDTO upsertCandidates(
      MemoryCandidateUpsertRequestDTO request) {
    return memoryCandidateUpsertSupport.upsert(request, vectorStore);
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
  @Transactional
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
