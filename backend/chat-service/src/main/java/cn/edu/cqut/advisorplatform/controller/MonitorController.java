package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MonitorRealtimeResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/monitor")
@RequiredArgsConstructor
public class MonitorController {
  private final MonitorService monitorService;

  @GetMapping("/realtime")
  public ApiResponseDTO<MonitorRealtimeResponseDTO> getRealtime(
      @RequestParam(value = "minutes", defaultValue = "15") int minutes,
      @RequestParam(value = "stepSeconds", defaultValue = "10") int stepSeconds,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getRole() != UserDO.UserRole.ADMIN) {
      throw new ForbiddenException("仅管理员可访问监控数据");
    }
    return ApiResponseDTO.success(monitorService.getRealtimeMetrics(minutes, stepSeconds));
  }
}
