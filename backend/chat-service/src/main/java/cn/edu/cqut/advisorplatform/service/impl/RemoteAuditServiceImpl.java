package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.client.AuditServiceClient;
import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditModule;
import cn.edu.cqut.advisorplatform.service.AuditService;
import cn.edu.cqut.advisorplatform.service.storage.AuditLogStorage;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RemoteAuditServiceImpl implements AuditService {

  private final AuditServiceClient auditServiceClient;

  @Qualifier("jdbcAuditLogStorage")
  private final AuditLogStorage fallbackStorage;

  @Override
  public void saveAuditLog(AuditLogDO auditLog) {
    auditServiceClient.saveLog(auditLog);
  }

  @Override
  @Async
  public void saveAuditLogAsync(AuditLogDO auditLog) {
    try {
      saveAuditLog(auditLog);
    } catch (Exception ex) {
      log.warn(
          "Remote audit save failed: traceId={}, reason={}",
          auditLog.getTraceId(),
          ex.getMessage());
      saveAuditLogFallback(auditLog);
    }
  }

  @Override
  @Async
  public void saveAuditLogsAsync(List<AuditLogDO> auditLogs) {
    try {
      auditServiceClient.saveLogs(auditLogs);
    } catch (Exception ex) {
      log.warn(
          "Remote audit batch save failed: count={}, reason={}",
          auditLogs == null ? 0 : auditLogs.size(),
          ex.getMessage());
      saveAuditLogsFallback(auditLogs);
    }
  }

  private void saveAuditLogFallback(AuditLogDO auditLog) {
    if (auditLog == null) {
      return;
    }
    try {
      fallbackStorage.saveAsync(auditLog);
    } catch (Exception fallbackError) {
      log.error(
          "Local audit fallback failed: traceId={}, reason={}",
          auditLog.getTraceId(),
          fallbackError.getMessage(),
          fallbackError);
    }
  }

  private void saveAuditLogsFallback(List<AuditLogDO> auditLogs) {
    if (auditLogs == null || auditLogs.isEmpty()) {
      return;
    }
    try {
      fallbackStorage.saveBatch(auditLogs);
    } catch (Exception fallbackError) {
      log.error(
          "Local audit batch fallback failed: count={}, reason={}",
          auditLogs.size(),
          fallbackError.getMessage(),
          fallbackError);
    }
  }

  @Override
  public PageResponseDTO<AuditLogDO> queryAuditLogs(
      Long userId,
      AuditModule module,
      AuditAction action,
      LocalDateTime startTime,
      LocalDateTime endTime,
      Pageable pageable) {
    throw new UnsupportedOperationException("queryAuditLogs is not supported in chat-service");
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
    throw new UnsupportedOperationException("queryAuditLogs is not supported in chat-service");
  }

  @Override
  public AuditLogDO getAuditLogById(Long id) {
    throw new UnsupportedOperationException("getAuditLogById is not supported in chat-service");
  }

  @Override
  public long countByUserAndModule(Long userId, AuditModule module) {
    throw new UnsupportedOperationException(
        "countByUserAndModule is not supported in chat-service");
  }

  @Override
  public long countByUserAndModuleAndAction(Long userId, AuditModule module, AuditAction action) {
    throw new UnsupportedOperationException(
        "countByUserAndModuleAndAction is not supported in chat-service");
  }
}
