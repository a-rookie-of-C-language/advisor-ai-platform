package cn.edu.cqut.advisorplatform.client;

import cn.edu.cqut.advisorplatform.config.feign.InternalTokenFeignConfig;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "audit-service", configuration = InternalTokenFeignConfig.class)
public interface AuditServiceClient {

  @PostMapping("/internal/audit/log")
  ApiResponseDTO<Void> saveLog(@RequestBody AuditLogDO auditLog);

  @PostMapping("/internal/audit/logs")
  ApiResponseDTO<Void> saveLogs(@RequestBody List<AuditLogDO> auditLogs);
}
