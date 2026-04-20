package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal/audit")
@RequiredArgsConstructor
public class InternalAuditController {

    private final AuditService auditService;

    @PostMapping("/log")
    public ApiResponseDTO<Void> saveLog(@RequestBody AuditLogDO auditLog) {
        auditService.saveAuditLog(auditLog);
        return ApiResponseDTO.success();
    }

    @PostMapping("/logs")
    public ApiResponseDTO<Void> saveLogs(@RequestBody List<AuditLogDO> auditLogs) {
        auditService.saveAuditLogsAsync(auditLogs);
        return ApiResponseDTO.success();
    }
}
