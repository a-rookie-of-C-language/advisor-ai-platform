package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateItemDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.memoryservice.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import cn.edu.cqut.advisorplatform.service.vector.EmbeddingService;
import cn.edu.cqut.advisorplatform.service.vector.MemoryServiceFactory;
import cn.edu.cqut.advisorplatform.service.vector.MemoryVectorService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemoryCandidateUpsertSupport {

  private static final double SIMILARITY_THRESHOLD = 0.85d;

  private final UserMemoryDao userMemoryDao;
  private final MemoryServiceFactory memoryServiceFactory;
  private final EmbeddingService embeddingService;
  private final PlatformTransactionManager transactionManager;

  public MemoryCandidateUpsertResponseDTO upsert(
      MemoryCandidateUpsertRequestDTO request, String vectorStore) {
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
    TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
    txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    for (MemoryCandidateItemDTO candidate : candidates) {
      if (isBlankCandidate(candidate)) {
        rejected++;
        continue;
      }

      String normalizedContent = candidate.getContent().trim();
      BigDecimal confidence = toDecimal(candidate.getConfidence(), 0.7d, 3);

      try {
        double[] embedding = embeddingService.embed(normalizedContent);
        txTemplate.executeWithoutResult(
            status ->
                upsertOne(
                    request, candidate, vectorService, normalizedContent, confidence, embedding));
        accepted++;
      } catch (Exception exc) {
        log.warn(
            "memory_write_failed userId={}, kbId={}, contentHash={}",
            request.getUserId(),
            request.getKbId(),
            Integer.toHexString(normalizedContent.hashCode()),
            exc);
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

  private boolean isBlankCandidate(MemoryCandidateItemDTO candidate) {
    return candidate == null
        || candidate.getContent() == null
        || candidate.getContent().trim().isEmpty();
  }

  private void upsertOne(
      MemoryCandidateUpsertRequestDTO request,
      MemoryCandidateItemDTO candidate,
      MemoryVectorService vectorService,
      String normalizedContent,
      BigDecimal confidence,
      double[] embedding) {
    if (vectorService != null) {
      Optional<UserMemoryDO> similar =
          vectorService.findSimilar(
              request.getUserId(), request.getKbId(), embedding, SIMILARITY_THRESHOLD);
      if (similar.isPresent()) {
        updateSimilarMemory(
            candidate, vectorService, normalizedContent, confidence, embedding, similar.get());
        return;
      }
    }

    UserMemoryDO row = new UserMemoryDO();
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
  }

  private void updateSimilarMemory(
      MemoryCandidateItemDTO candidate,
      MemoryVectorService vectorService,
      String normalizedContent,
      BigDecimal confidence,
      double[] embedding,
      UserMemoryDO row) {
    row.setContent(normalizedContent);
    row.setConfidence(row.getConfidence().max(confidence));
    row.setMemoryKey(extractMemoryKey(candidate.getTags()));
    row.setSourceTurnId(candidate.getSourceTurnId());
    row.setTags(candidate.getTags() == null ? new HashMap<>() : candidate.getTags());
    row.setUpdatedAt(LocalDateTime.now());
    row = userMemoryDao.save(row);
    vectorService.updateEmbedding(row.getId(), embedding);
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
}
