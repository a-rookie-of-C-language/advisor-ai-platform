package cn.edu.cqut.advisorplatform.mapper;

import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface AuditLogMapper {

  void insert(AuditLogDO auditLog);

  void update(AuditLogDO auditLog);

  void delete(Long id);

  AuditLogDO selectById(Long id);

  List<AuditLogDO> selectByUserId(@Param("userId") Long userId);

  List<AuditLogDO> selectByUserIdPageable(
      @Param("userId") Long userId,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByUserId(@Param("userId") Long userId);

  List<AuditLogDO> selectByOperation(@Param("operation") String operation);

  List<AuditLogDO> selectByDateRange(
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  List<AuditLogDO> selectAll();

  List<AuditLogDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  long deleteByDateBefore(@Param("timestamp") LocalDateTime timestamp);
}
