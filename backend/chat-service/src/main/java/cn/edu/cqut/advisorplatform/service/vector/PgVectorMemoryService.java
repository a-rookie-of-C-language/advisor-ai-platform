package cn.edu.cqut.advisorplatform.service.vector;

import cn.edu.cqut.advisorplatform.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
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
      Long userId, Long kbId, double[] embedding, Double threshold) {
    if (embedding == null || embedding.length == 0) {
      return Optional.empty();
    }
    String embeddingStr = vectorToString(embedding);
    Double effectiveThreshold = Optional.ofNullable(threshold).orElse(DEFAULT_SIMILARITY_THRESHOLD);
    double maxDistance = Math.max(0.0, 1.0 - effectiveThreshold);

    log.debug(
        "findSimilar: userId={}, kbId={}, similarity={}, maxDistance={}",
        userId,
        kbId,
        effectiveThreshold,
        maxDistance);
    return userMemoryDao.findMostSimilarByVector(userId, kbId, embeddingStr, maxDistance);
  }

  @Override
  public List<UserMemoryDO> search(Long userId, Long kbId, double[] queryEmbedding, int topK) {
    if (queryEmbedding == null || queryEmbedding.length == 0) {
      return List.of();
    }
    String embeddingStr = vectorToString(queryEmbedding);
    log.debug("search: userId={}, kbId={}, topK={}", userId, kbId, topK);
    return userMemoryDao.searchByVector(userId, kbId, embeddingStr, Math.max(1, topK));
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
