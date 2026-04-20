package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.AuditService;
import cn.edu.cqut.advisorplatform.service.storage.AuditLogStorage;
import cn.edu.cqut.advisorplatform.service.storage.AuditStorageFactory;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements AuditService {

  private final AuditStorageFactory auditStorageFactory;

  private AuditLogStorage getStorage() {
    return auditStorageFactory.getStorage();
  }

  @Override
  public void saveAuditLog(AuditLogDO auditLog) {
    getStorage().save(auditLog);
  }

  @Override
  public void saveAuditLogAsync(AuditLogDO auditLog) {
    getStorage().saveAsync(auditLog);
  }

  @Override
  public void saveAuditLogsAsync(List<AuditLogDO> auditLogs) {
    getStorage().saveBatch(auditLogs);
  }

  @Override
  public PageResponseDTO<AuditLogDO> queryAuditLogs(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      Pageable pageable) {
    return getStorage().search(userId, module, action, startTime, endTime, pageable);
  }

  @Override
  public PageResponseDTO<AuditLogDO> queryAuditLogs(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      int page,
      int size) {
    return queryAuditLogs(
        userId,
        module,
        action,
        startTime,
        endTime,
        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
  }

  @Override
  public AuditLogDO getAuditLogById(Long id) {
    AuditLogDO auditLog = getStorage().findById(id);
    if (auditLog == null) {
      throw new NotFoundException("Audit log not found with id: " + id);
    }
    return auditLog;
  }

  @Override
  public long countByUserAndModule(Long userId, AuditModule module) {
    return getStorage().countByUserAndModule(userId, module);
  }

  @Override
  public long countByUserAndModuleAndAction(Long userId, AuditModule module, AuditAction action) {
    return getStorage().countByUserAndModuleAndAction(userId, module, action);
  }
}
