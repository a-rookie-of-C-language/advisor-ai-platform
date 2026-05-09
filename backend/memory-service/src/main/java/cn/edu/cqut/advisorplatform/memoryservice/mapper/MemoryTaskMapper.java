package cn.edu.cqut.advisorplatform.memoryservice.mapper;

import cn.edu.cqut.advisorplatform.memoryservice.entity.MemoryTaskDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface MemoryTaskMapper {

  void insert(MemoryTaskDO task);

  void update(MemoryTaskDO task);

  void delete(Long id);

  MemoryTaskDO selectById(Long id);

  List<MemoryTaskDO> selectByUserId(@Param("userId") Long userId);

  List<MemoryTaskDO> selectByUserIdPageable(
      @Param("userId") Long userId,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByUserId(@Param("userId") Long userId);

  List<MemoryTaskDO> selectByStatus(@Param("status") String status);

  List<MemoryTaskDO> selectByUserIdAndStatus(
      @Param("userId") Long userId,
      @Param("status") String status);

  List<MemoryTaskDO> selectByUserIdAndStatusPageable(
      @Param("userId") Long userId,
      @Param("status") String status,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByUserIdAndStatus(
      @Param("userId") Long userId,
      @Param("status") String status);

  List<MemoryTaskDO> selectBySessionId(@Param("sessionId") Long sessionId);

  List<MemoryTaskDO> selectByDateRange(
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  List<MemoryTaskDO> selectAll();

  List<MemoryTaskDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  List<MemoryTaskDO> selectPendingTasks(
      @Param("limit") int limit);

  int updateStatus(
      @Param("id") Long id,
      @Param("status") String status);

  long deleteByUserId(@Param("userId") Long userId);
}
