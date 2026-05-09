package cn.edu.cqut.advisorplatform.memoryservice.dao;

import cn.edu.cqut.advisorplatform.memoryservice.entity.MemoryTaskDO;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemoryTaskDao {
  Optional<MemoryTaskDO> findBySessionIdAndTurnId(@Param("sessionId") Long sessionId, @Param("turnId") String turnId);

  List<MemoryTaskDO> findPendingTasks(@Param("maxRetries") Integer maxRetries, @Param("offset") int offset, @Param("limit") int limit);

  int updateStatus(@Param("id") Long id, @Param("status") String status);

  int markFailed(@Param("id") Long id, @Param("error") String error, @Param("now") LocalDateTime now);

  void insert(MemoryTaskDO task);

  void update(MemoryTaskDO task);

  default MemoryTaskDO save(MemoryTaskDO task) {
    if (task.getId() == null) insert(task); else update(task);
    return task;
  }
}
