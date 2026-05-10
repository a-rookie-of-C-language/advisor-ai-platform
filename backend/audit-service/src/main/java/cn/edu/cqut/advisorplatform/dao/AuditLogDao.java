package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AuditLogDao {
  void insert(AuditLogDO log);

  Optional<AuditLogDO> findById(@Param("id") Long id);

  List<AuditLogDO> findByConditions(
      @Param("userId") Long userId,
      @Param("module") String module,
      @Param("action") String action,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByConditions(
      @Param("userId") Long userId,
      @Param("module") String module,
      @Param("action") String action,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  long countByUserAndModule(@Param("userId") Long userId, @Param("module") String module);

  long countByUserAndModuleAndAction(
      @Param("userId") Long userId, @Param("module") String module, @Param("action") String action);

  default AuditLogDO save(AuditLogDO log) {
    insert(log);
    return log;
  }
}
