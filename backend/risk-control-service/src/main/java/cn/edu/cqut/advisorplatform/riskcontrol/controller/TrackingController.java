package cn.edu.cqut.advisorplatform.riskcontrol.controller;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.TrackingEventMessage;
import cn.edu.cqut.advisorplatform.riskcontrol.kafka.KafkaConfig;
import cn.edu.cqut.advisorplatform.riskcontrol.service.RiskEngine;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/tracking")
@RequiredArgsConstructor
public class TrackingController {

  private final KafkaTemplate<String, Object> kafkaTemplate;
  private final RiskEngine riskEngine;

  @PostMapping("/event")
  public ResponseEntity<Void> trackEvent(@RequestBody TrackingEventMessage event) {
    if (event.getEventId() == null) {
      event.setEventId(UUID.randomUUID().toString());
    }
    if (event.getTimestamp() == null) {
      event.setTimestamp(System.currentTimeMillis());
    }

    log.info(
        "Received tracking event: userId={}, eventType={}, eventName={}",
        event.getUserId(),
        event.getEventType(),
        event.getEventName());

    kafkaTemplate.send(KafkaConfig.TRACKING_EVENTS_TOPIC, event.getEventId(), event);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/check")
  public ResponseEntity<RiskCheckResponse> checkRisk(@RequestBody RiskCheckRequest request) {
    log.info(
        "Risk check request: userId={}, requestPath={}",
        request.getUserId(),
        request.getRequestPath());

    RiskCheckResponse response = riskEngine.check(request);
    if (response.isPassed()) {
      return ResponseEntity.ok(response);
    }
    return ResponseEntity.status(response.getStatusCode()).body(response);
  }
}
