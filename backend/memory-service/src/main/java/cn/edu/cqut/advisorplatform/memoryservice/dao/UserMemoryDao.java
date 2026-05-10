package cn.edu.cqut.advisorplatform.memoryservice.dao;

import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMemoryDao {
  List<UserMemoryDO> searchByScope(
      @Param("userId") Long userId,
      @Param("kbId") Long kbId,
      @Param("query") String query,
      @Param("now") LocalDateTime now,
      @Param("offset") int offset,
      @Param("limit") int limit);

  Optional<UserMemoryDO> findMostSimilarByVector(
      @Param("userId") Long userId,
      @Param("kbId") Long kbId,
      @Param("embedding") String embedding,
      @Param("maxDistance") Double maxDistance);

  List<UserMemoryDO> searchByVector(
      @Param("userId") Long userId, @Param("kbId") Long kbId, @Param("embedding") String embedding, @Param("topK") Integer topK);

  int updateEmbeddingById(@Param("id") Long id, @Param("embedding") String embedding);

  List<UserMemoryDO> findSoftDeletedBefore(@Param("cutoff") LocalDateTime cutoff);

  List<UserMemoryDO> findLowConfidenceStale(
      @Param("maxConfidence") BigDecimal maxConfidence, @Param("staleSince") LocalDateTime staleSince, @Param("offset") int offset, @Param("limit") int limit);

  int incrementAccessCount(@Param("id") Long id);

  int deleteAllByIdInBatch(@Param("ids") Iterable<Long> ids);

  void insert(UserMemoryDO row);

  void update(UserMemoryDO row);

  default UserMemoryDO save(UserMemoryDO row) {
    if (row.getId() == null) insert(row); else update(row);
    return row;
  }
}
