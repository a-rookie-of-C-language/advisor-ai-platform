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

  List<AuditLogDO> selectByModule(@Param("module") String module);

  List<AuditLogDO> selectByAction(@Param("action") String action);

  List<AuditLogDO> selectByOperationType(@Param("operationType") String operationType);

  List<AuditLogDO> selectByOperationResult(@Param("operationResult") String operationResult);

  List<AuditLogDO> selectByDateRange(
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  List<AuditLogDO> selectByDateRangePageable(
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByDateRange(
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  List<AuditLogDO> selectByIpAddress(@Param("ipAddress") String ipAddress);

  List<AuditLogDO> selectAll();

  List<AuditLogDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  // 动态查询 - 复杂条件
  List<AuditLogDO> selectByDynamicCondition(
      @Param("userId") Long userId,
      @Param("module") String module,
      @Param("action") String action,
      @Param("operationType") String operationType,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByDynamicCondition(
      @Param("userId") Long userId,
      @Param("module") String module,
      @Param("action") String action,
      @Param("operationType") String operationType,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  long deleteByDateBefore(@Param("timestamp") LocalDateTime timestamp);
}
