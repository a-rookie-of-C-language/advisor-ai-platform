package cn.edu.cqut.advisorplatform.service.vector;

import cn.edu.cqut.advisorplatform.entity.memory.UserMemoryDO;
import java.util.List;
import java.util.Optional;

public interface MemoryVectorService {
  String storeType();

  Optional<UserMemoryDO> findSimilar(
      Long userId, Long knowledgeBaseId, double[] embedding, Double threshold);

  List<UserMemoryDO> search(Long userId, Long knowledgeBaseId, double[] queryEmbedding, int topK);

  List<UserMemoryDO> searchByType(
      Long userId, Long knowledgeBaseId, double[] queryEmbedding, int topK, String memoryType);

  void updateEmbedding(Long memoryId, double[] embedding);

  int getDimension();
}
