package cn.edu.cqut.advisorplatform.service.storage;

import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.audit.AuditAction;
import cn.edu.cqut.advisorplatform.entity.audit.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.audit.AuditModule;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface AuditLogStorage {

  String storeType();

  void save(AuditLogDO auditLog);

  void saveAsync(AuditLogDO auditLog);

  void saveBatch(List<AuditLogDO> auditLogs);

  PageResponseDTO<AuditLogDO> search(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      Pageable pageable);

  AuditLogDO findById(Long id);

  long countByUserAndModule(Long userId, AuditModule module);

  long countByUserAndModuleAndAction(Long userId, AuditModule module, AuditAction action);
}
