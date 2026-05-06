package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.TrackingEventMessage;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserViolation;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserViolationRepository;
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

  private final List<RiskFilter> filters;
  private final UserViolationRepository userViolationRepository;
  private final MeterRegistry meterRegistry;

  public RiskEngine(
      List<RiskFilter> filters,
      UserViolationRepository userViolationRepository,
      MeterRegistry meterRegistry) {
    this.filters = filters;
    this.userViolationRepository = userViolationRepository;
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
              .requestBody(request.getRequestBody())
              .ipAddress(request.getIpAddress())
              .createdAt(LocalDateTime.now(ZoneOffset.UTC))
              .build();
      userViolationRepository.save(violation);
    } catch (Exception e) {
      log.error("Failed to record violation: userId={}", request.getUserId(), e);
    }
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
