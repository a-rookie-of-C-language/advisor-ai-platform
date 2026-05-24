package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface AuditService {

  void saveAuditLog(AuditLogDO auditLog);

  void saveAuditLogAsync(AuditLogDO auditLog);

  void saveAuditLogsAsync(List<AuditLogDO> auditLogs);

  PageResponseDTO<AuditLogDO> queryAuditLogs(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      Pageable pageable);

  PageResponseDTO<AuditLogDO> queryAuditLogs(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      int page,
      int size);

  AuditLogDO getAuditLogById(Long id);

  long countByUserAndModule(Long userId, AuditModule module);

  long countByUserAndModuleAndAction(Long userId, AuditModule module, AuditAction action);
}
