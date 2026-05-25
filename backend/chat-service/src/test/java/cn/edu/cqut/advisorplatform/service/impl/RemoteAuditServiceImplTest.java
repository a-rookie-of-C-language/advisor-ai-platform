package cn.edu.cqut.advisorplatform.service.impl;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.client.AuditServiceClient;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.service.storage.AuditLogStorage;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RemoteAuditServiceImplTest {

  @Mock private AuditServiceClient auditServiceClient;
  @Mock private AuditLogStorage fallbackStorage;

  @Test
  void saveAuditLogAsyncFallsBackToLocalStorageWhenRemoteFails() {
    AuditLogDO auditLog = new AuditLogDO();
    auditLog.setTraceId("trace-1");
    RemoteAuditServiceImpl service =
        new RemoteAuditServiceImpl(auditServiceClient, fallbackStorage);
    when(auditServiceClient.saveLog(auditLog)).thenThrow(new RuntimeException("remote down"));

    service.saveAuditLogAsync(auditLog);

    verify(fallbackStorage).saveAsync(auditLog);
  }

  @Test
  void saveAuditLogsAsyncFallsBackToLocalStorageWhenRemoteFails() {
    AuditLogDO auditLog = new AuditLogDO();
    auditLog.setTraceId("trace-2");
    List<AuditLogDO> auditLogs = List.of(auditLog);
    RemoteAuditServiceImpl service =
        new RemoteAuditServiceImpl(auditServiceClient, fallbackStorage);
    when(auditServiceClient.saveLogs(auditLogs)).thenThrow(new RuntimeException("remote down"));

    service.saveAuditLogsAsync(auditLogs);

    verify(fallbackStorage).saveBatch(auditLogs);
  }

  @Test
  void saveAuditLogAsyncDoesNotUseFallbackWhenRemoteSucceeds() {
    AuditLogDO auditLog = new AuditLogDO();
    RemoteAuditServiceImpl service =
        new RemoteAuditServiceImpl(auditServiceClient, fallbackStorage);

    service.saveAuditLogAsync(auditLog);

    verify(fallbackStorage, never()).saveAsync(auditLog);
  }
}
