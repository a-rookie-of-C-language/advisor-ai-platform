package cn.edu.cqut.advisorplatform.service.vector;

import cn.edu.cqut.advisorplatform.memoryservice.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PgVectorMemoryService implements MemoryVectorService {

  private final UserMemoryDao userMemoryDao;

  private static final double DEFAULT_SIMILARITY_THRESHOLD = 0.9;
  private static final int DEFAULT_DIMENSION = 1024;

  @Override
  public String storeType() {
    return "pgvector";
  }

  @Override
  public Optional<UserMemoryDO> findSimilar(
      Long userId, Long knowledgeBaseId, double[] embedding, Double threshold) {
    if (embedding == null || embedding.length == 0) {
      return Optional.empty();
    }
    String embeddingStr = vectorToString(embedding);
    Double effectiveThreshold = Optional.ofNullable(threshold).orElse(DEFAULT_SIMILARITY_THRESHOLD);
    double maxDistance = Math.max(0.0, 1.0 - effectiveThreshold);

    log.debug(
        "findSimilar: userId={}, knowledgeBaseId={}, similarity={}, maxDistance={}",
        userId,
        knowledgeBaseId,
        effectiveThreshold,
        maxDistance);
    return userMemoryDao.findMostSimilarByVector(
        userId, knowledgeBaseId, embeddingStr, maxDistance);
  }

  @Override
  public List<UserMemoryDO> search(
      Long userId, Long knowledgeBaseId, double[] queryEmbedding, int topK) {
    if (queryEmbedding == null || queryEmbedding.length == 0) {
      return List.of();
    }
    String embeddingStr = vectorToString(queryEmbedding);
    log.debug("search: userId={}, knowledgeBaseId={}, topK={}", userId, knowledgeBaseId, topK);
    return userMemoryDao.searchByVector(userId, knowledgeBaseId, embeddingStr, Math.max(1, topK));
  }

  @Override
  public List<UserMemoryDO> searchByType(
      Long userId, Long knowledgeBaseId, double[] queryEmbedding, int topK, String memoryType) {
    if (queryEmbedding == null || queryEmbedding.length == 0) {
      return List.of();
    }
    String embeddingStr = vectorToString(queryEmbedding);
    log.debug(
        "searchByType: userId={}, knowledgeBaseId={}, memoryType={}, topK={}",
        userId,
        knowledgeBaseId,
        memoryType,
        topK);
    return userMemoryDao.searchByVectorAndType(
        userId, knowledgeBaseId, embeddingStr, Math.max(1, topK), memoryType);
  }

  @Override
  public void updateEmbedding(Long memoryId, double[] embedding) {
    if (memoryId == null || embedding == null || embedding.length == 0) {
      return;
    }
    userMemoryDao.updateEmbeddingById(memoryId, vectorToString(embedding));
  }

  @Override
  public int getDimension() {
    return DEFAULT_DIMENSION;
  }

  private String vectorToString(double[] embedding) {
    return Arrays.toString(embedding);
  }
}
