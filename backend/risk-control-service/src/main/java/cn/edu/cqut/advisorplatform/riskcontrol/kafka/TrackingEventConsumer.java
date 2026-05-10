package cn.edu.cqut.advisorplatform.riskcontrol.kafka;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.TrackingEventMessage;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.TrackingEvent;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.TrackingEventRepository;
import cn.edu.cqut.advisorplatform.riskcontrol.service.RiskEngine;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrackingEventConsumer {

  private final TrackingEventRepository trackingEventRepository;
  private final RiskEngine riskEngine;

  @KafkaListener(topics = KafkaConfig.TRACKING_EVENTS_TOPIC, groupId = "risk-control-group")
  public void consume(TrackingEventMessage message) {
    log.info(
        "Received tracking event: userId={}, eventType={}, eventName={}",
        message.getUserId(),
        message.getEventType(),
        message.getEventName());

    try {
      // 持久化到PostgreSQL
      TrackingEvent event =
          TrackingEvent.builder()
              .userId(message.getUserId())
              .sessionId(message.getSessionId())
              .eventType(message.getEventType())
              .eventName(message.getEventName())
              .pageUrl(message.getPageUrl())
              .elementId(message.getElementId())
              .ipAddress(message.getIpAddress())
              .userAgent(message.getUserAgent())
              .extraData(message.getExtraData())
              .createdAt(
                  LocalDateTime.ofEpochSecond(message.getTimestamp() / 1000, 0, ZoneOffset.UTC))
              .build();
      trackingEventRepository.save(event);

      // 执行风控检查
      riskEngine.processEvent(message);
    } catch (Exception e) {
      log.error(
          "Failed to process tracking event: userId={}, eventType={}",
          message.getUserId(),
          message.getEventType(),
          e);
    }
  }
}
