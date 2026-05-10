package cn.edu.cqut.advisorplatform.memoryservice.mapper;

import cn.edu.cqut.advisorplatform.memoryservice.entity.UserMemoryDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMemoryMapper {

  void insert(UserMemoryDO memory);

  void update(UserMemoryDO memory);

  void delete(Long id);

  UserMemoryDO selectById(Long id);

  List<UserMemoryDO> searchByScope(
      @Param("userId") Long userId,
      @Param("kbId") Long kbId,
      @Param("query") String query,
      @Param("now") LocalDateTime now,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int searchByScopeCount(
      @Param("userId") Long userId,
      @Param("kbId") Long kbId,
      @Param("query") String query,
      @Param("now") LocalDateTime now);

  Optional<UserMemoryDO> findMostSimilarByVector(
      @Param("userId") Long userId,
      @Param("kbId") Long kbId,
      @Param("embedding") String embedding,
      @Param("maxDistance") Double maxDistance);

  List<UserMemoryDO> selectByUserId(@Param("userId") Long userId);

  void markDeleted(@Param("id") Long id);
}
