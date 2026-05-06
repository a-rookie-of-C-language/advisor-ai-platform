package cn.edu.cqut.advisorplatform.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import cn.edu.cqut.advisorplatform.service.storage.AuditLogStorage;
import cn.edu.cqut.advisorplatform.service.storage.AuditStorageFactory;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class AuditServiceImplTest {

  @InjectMocks private AuditServiceImpl auditService;

  @Mock private AuditStorageFactory auditStorageFactory;

  @Mock private AuditLogStorage auditLogStorage;

  @Test
  void saveAuditLog_shouldCallStorage() {
    AuditLogDO log = new AuditLogDO();
    log.setUserId(1L);
    log.setModule(AuditModule.CHAT);
    log.setAction(AuditAction.CHAT);

    when(auditStorageFactory.getStorage()).thenReturn(auditLogStorage);

    auditService.saveAuditLog(log);

    verify(auditLogStorage).save(log);
  }

  @Test
  void queryAuditLogs_shouldReturnPagedResults() {
    AuditLogDO log = new AuditLogDO();
    log.setId(1L);
    log.setUserId(1L);
    log.setModule(AuditModule.CHAT);
    log.setAction(AuditAction.CHAT);

    PageResponseDTO<AuditLogDO> pageResponse = PageResponseDTO.of(List.of(log), 1, 0, 20);

    when(auditStorageFactory.getStorage()).thenReturn(auditLogStorage);
    when(auditLogStorage.search(any(), any(), any(), any(), any(), any(Pageable.class)))
        .thenReturn(pageResponse);

    PageResponseDTO<AuditLogDO> result =
        auditService.queryAuditLogs(1L, AuditModule.CHAT, null, null, null, 0, 20);

    assertNotNull(result);
    assertEquals(1, result.getRecords().size());
    assertEquals(1L, result.getRecords().get(0).getId());
  }

  @Test
  void getAuditLogById_shouldReturnLog() {
    AuditLogDO log = new AuditLogDO();
    log.setId(1L);
    log.setUserId(1L);

    when(auditStorageFactory.getStorage()).thenReturn(auditLogStorage);
    when(auditLogStorage.findById(1L)).thenReturn(log);

    AuditLogDO result = auditService.getAuditLogById(1L);

    assertNotNull(result);
    assertEquals(1L, result.getId());
  }

  @Test
  void getAuditLogById_withNonexistentId_shouldThrowException() {
    when(auditStorageFactory.getStorage()).thenReturn(auditLogStorage);
    when(auditLogStorage.findById(999L)).thenReturn(null);

    assertThrows(NotFoundException.class, () -> auditService.getAuditLogById(999L));
  }

  @Test
  void countByUserAndModule_shouldReturnCount() {
    when(auditStorageFactory.getStorage()).thenReturn(auditLogStorage);
    when(auditLogStorage.countByUserAndModule(1L, AuditModule.CHAT)).thenReturn(5L);

    long result = auditService.countByUserAndModule(1L, AuditModule.CHAT);

    assertEquals(5L, result);
  }

  @Test
  void countByUserAndModuleAndAction_shouldReturnCount() {
    when(auditStorageFactory.getStorage()).thenReturn(auditLogStorage);
    when(auditLogStorage.countByUserAndModuleAndAction(1L, AuditModule.CHAT, AuditAction.CHAT))
        .thenReturn(3L);

    long result =
        auditService.countByUserAndModuleAndAction(1L, AuditModule.CHAT, AuditAction.CHAT);

    assertEquals(3L, result);
  }
}
