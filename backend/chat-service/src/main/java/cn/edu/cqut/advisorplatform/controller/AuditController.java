package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.PageResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import cn.edu.cqut.advisorplatform.service.AuditService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

  private final AuditService auditService;

  @GetMapping("/logs")
  public ApiResponseDTO<PageResponseDTO<AuditLogDO>> getAuditLogs(
      @RequestParam(required = false) Long userId,
      @RequestParam(required = false) AuditModule module,
      @RequestParam(required = false) AuditAction action,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          LocalDateTime startTime,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          LocalDateTime endTime,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponseDTO.success(
        auditService.queryAuditLogs(userId, module, action, startTime, endTime, page, size));
  }

  @GetMapping("/logs/{id}")
  public ApiResponseDTO<AuditLogDO> getAuditLogById(@PathVariable Long id) {
    return ApiResponseDTO.success(auditService.getAuditLogById(id));
  }

  @GetMapping("/stats/module")
  public ApiResponseDTO<Long> countByUserAndModule(
      @RequestParam Long userId,
      @RequestParam AuditModule module,
      @RequestParam(required = false) AuditAction action) {
    if (action != null) {
      return ApiResponseDTO.success(
          auditService.countByUserAndModuleAndAction(userId, module, action));
    }
    return ApiResponseDTO.success(auditService.countByUserAndModule(userId, module));
  }

  @GetMapping("/stats/module-action")
  public ApiResponseDTO<Long> countByUserAndModuleAndAction(
      @RequestParam Long userId,
      @RequestParam AuditModule module,
      @RequestParam AuditAction action) {
    return ApiResponseDTO.success(
        auditService.countByUserAndModuleAndAction(userId, module, action));
  }
}
