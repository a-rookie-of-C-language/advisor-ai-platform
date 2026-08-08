package cn.edu.cqut.advisorplatform.controller.monitor;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.monitor.MonitorRealtimeResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.UserRole;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/monitor")
@RequiredArgsConstructor
@Slf4j
public class MonitorController {
  private static final int STREAM_INTERVAL_SECONDS = 10;

  private final MonitorService monitorService;
  private final ObjectMapper objectMapper;

  @GetMapping("/realtime")
  public ApiResponseDTO<MonitorRealtimeResponseDTO> getRealtime(
      @RequestParam(value = "minutes", defaultValue = "15") int minutes,
      @RequestParam(value = "stepSeconds", defaultValue = "10") int stepSeconds,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
      throw new ForbiddenException("仅管理员可访问监控数据");
    }
    return ApiResponseDTO.success(monitorService.getRealtimeMetrics(minutes, stepSeconds));
  }

  @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public StreamingResponseBody streamRealtime(
      @RequestParam(value = "minutes", defaultValue = "15") int minutes,
      @RequestParam(value = "stepSeconds", defaultValue = "10") int stepSeconds,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
      throw new ForbiddenException("仅管理员可访问监控数据");
    }
    return outputStream -> {
      while (!Thread.currentThread().isInterrupted()) {
        try {
          MonitorRealtimeResponseDTO data = monitorService.getRealtimeMetrics(minutes, stepSeconds);
          String event = "event: monitor\ndata: " + objectMapper.writeValueAsString(data) + "\n\n";
          outputStream.write(event.getBytes(StandardCharsets.UTF_8));
          outputStream.flush();
          Thread.sleep(STREAM_INTERVAL_SECONDS * 1000L);
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
          break;
        } catch (IOException e) {
          log.debug("monitor sse client disconnected");
          break;
        } catch (Exception e) {
          log.warn("monitor sse stream error", e);
          writeErrorEvent(outputStream, e.getMessage());
          break;
        }
      }
    };
  }

  private void writeErrorEvent(java.io.OutputStream outputStream, @Nullable String message) {
    String safeMessage = message == null || message.isBlank() ? "监控流异常" : message;
    String escapedMessage =
        safeMessage
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\r", " ")
            .replace("\n", " ");
    String event = "event: error\ndata: {\"message\":\"" + escapedMessage + "\"}\n\n";
    try {
      outputStream.write(event.getBytes(StandardCharsets.UTF_8));
      outputStream.flush();
    } catch (IOException ignored) {
      // client might already disconnect
    }
  }
}
