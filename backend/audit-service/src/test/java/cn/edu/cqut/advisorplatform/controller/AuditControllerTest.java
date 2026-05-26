package cn.edu.cqut.advisorplatform.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditModule;
import cn.edu.cqut.advisorplatform.service.AuditService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuditControllerTest {

  @InjectMocks private AuditController auditController;

  @Mock private AuditService auditService;

  @Test
  void getAuditLogs_shouldReturnSuccess() {
    AuditLogDO log = new AuditLogDO();
    log.setId(1L);
    log.setUserId(1L);
    log.setModule(AuditModule.CHAT);
    log.setAction(AuditAction.CHAT);

    PageResponseDTO<AuditLogDO> response = PageResponseDTO.of(List.of(log), 1, 0, 20);

    when(auditService.queryAuditLogs(
            any(), any(), any(), any(), any(), any(int.class), any(int.class)))
        .thenReturn(response);

    var result = auditController.getAuditLogs(null, null, null, null, null, 0, 20);
    assertThat(result.getCode()).isEqualTo(200);
    assertThat(result.getData().getRecords()).hasSize(1);
  }

  @Test
  void getAuditLogById_shouldReturnSuccess() {
    AuditLogDO log = new AuditLogDO();
    log.setId(1L);
    log.setUserId(1L);

    when(auditService.getAuditLogById(1L)).thenReturn(log);

    var result = auditController.getAuditLogById(1L);
    assertThat(result.getCode()).isEqualTo(200);
    assertThat(result.getData().getId()).isEqualTo(1L);
  }

  @Test
  void countByUserAndModule_shouldReturnSuccess() {
    when(auditService.countByUserAndModule(1L, AuditModule.CHAT)).thenReturn(5L);

    var result = auditController.countByUserAndModule(1L, AuditModule.CHAT, null);
    assertThat(result.getCode()).isEqualTo(200);
    assertThat(result.getData()).isEqualTo(5L);
  }

  @Test
  void countByUserAndModuleAndAction_shouldReturnSuccess() {
    when(auditService.countByUserAndModuleAndAction(1L, AuditModule.CHAT, AuditAction.CHAT))
        .thenReturn(3L);

    var result =
        auditController.countByUserAndModuleAndAction(1L, AuditModule.CHAT, AuditAction.CHAT);
    assertThat(result.getCode()).isEqualTo(200);
    assertThat(result.getData()).isEqualTo(3L);
  }
}
