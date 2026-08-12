package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.UserViolationDao;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.TrackingEventMessage;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserViolation;
import cn.edu.cqut.advisorplatform.riskcontrol.service.filter.RiskFilter;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class RiskEngine {

  private static final int REQUEST_BODY_PREVIEW_LENGTH = 2048;

  private final List<RiskFilter> filters;
  private final UserViolationDao userViolationDao;
  private final MeterRegistry meterRegistry;

  public RiskEngine(
      List<RiskFilter> filters, UserViolationDao userViolationDao, MeterRegistry meterRegistry) {
    this.filters = filters;
    this.userViolationDao = userViolationDao;
    this.meterRegistry = meterRegistry;
  }

  public RiskCheckResponse check(RiskCheckRequest request) {
    for (RiskFilter filter : filters) {
      RiskCheckResponse response = filter.check(request);
      if (!response.isPassed()) {
        String action = normalizeAction(response.getAction());
        response.setAction(action);
        if (response.getStatusCode() <= 0) {
          response.setStatusCode("review".equals(action) ? 202 : 400);
        }

        Counter.builder("risk.filter.hit")
            .tag("filter", filter.getName())
            .tag("category", safeTag(response.getCategory()))
            .tag("action", action)
            .register(meterRegistry)
            .increment();

        log.info(
            "Risk check failed: filter={}, userId={}, category={}, action={}, reason={}",
            filter.getName(),
            request.getUserId(),
            response.getCategory(),
            action,
            response.getReason());

        if (request.getUserId() != null) {
          recordViolation(request, response);
        }

        return response;
      }
    }

    Counter.builder("risk.filter.pass")
        .tag(
            "direction", request.getDirection() == null ? "unknown" : request.getDirection().name())
        .register(meterRegistry)
        .increment();
    return RiskCheckResponse.builder().passed(true).build();
  }

  public void processEvent(TrackingEventMessage message) {
    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(message.getUserId())
            .sessionId(message.getSessionId())
            .ipAddress(message.getIpAddress())
            .eventType(message.getEventType())
            .content(message.getExtraData())
            .build();
    check(request);
  }

  private void recordViolation(RiskCheckRequest request, RiskCheckResponse response) {
    try {
      UserViolation violation =
          UserViolation.builder()
              .userId(request.getUserId())
              .violationType(response.getCategory())
              .requestPath(request.getRequestPath())
              .requestBody(previewRequestBody(request.getRequestBody()))
              .ipAddress(request.getIpAddress())
              .createdAt(LocalDateTime.now(ZoneOffset.UTC))
              .build();
      userViolationDao.save(violation);
    } catch (Exception e) {
      log.error("Failed to record violation: userId={}", request.getUserId(), e);
    }
  }

  private String previewRequestBody(String requestBody) {
    if (requestBody == null || requestBody.isBlank()) {
      return requestBody;
    }
    String sanitized = removeUnsupportedControlChars(requestBody);
    if (sanitized.length() <= REQUEST_BODY_PREVIEW_LENGTH) {
      return sanitized;
    }
    return sanitized.substring(0, REQUEST_BODY_PREVIEW_LENGTH) + "...[truncated]";
  }

  private String removeUnsupportedControlChars(String value) {
    StringBuilder builder = new StringBuilder(value.length());
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      if (ch == '\n' || ch == '\r' || ch == '\t' || !Character.isISOControl(ch)) {
        builder.append(ch);
      }
    }
    return builder.toString();
  }

  private String normalizeAction(String action) {
    if (action == null || action.isBlank()) {
      return "reject";
    }
    String normalized = action.trim().toLowerCase();
    return switch (normalized) {
      case "reject", "review", "challenge" -> normalized;
      default -> "reject";
    };
  }

  private String safeTag(String value) {
    return value == null || value.isBlank() ? "unknown" : value;
  }
}
