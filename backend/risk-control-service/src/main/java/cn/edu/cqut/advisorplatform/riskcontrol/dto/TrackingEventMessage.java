package cn.edu.cqut.advisorplatform.riskcontrol.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingEventMessage {

  private String eventId;
  private Long userId;
  private String sessionId;
  private String eventType;
  private String eventName;
  private String pageUrl;
  private String elementId;
  private String ipAddress;
  private String userAgent;
  private String extraData;
  private Long timestamp;
}
