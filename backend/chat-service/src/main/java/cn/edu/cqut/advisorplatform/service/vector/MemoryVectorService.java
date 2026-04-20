package cn.edu.cqut.advisorplatform.service.vector;

import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
import java.util.List;
import java.util.Optional;

public interface MemoryVectorService {
    String storeType();

    Optional<UserMemoryDO> findSimilar(Long userId, Long kbId, double[] embedding, Double threshold);

    List<UserMemoryDO> search(Long userId, Long kbId, double[] queryEmbedding, int topK);

    void updateEmbedding(Long memoryId, double[] embedding);

    int getDimension();
}
