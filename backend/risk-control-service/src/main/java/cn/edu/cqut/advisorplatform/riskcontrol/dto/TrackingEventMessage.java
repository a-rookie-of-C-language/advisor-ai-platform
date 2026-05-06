package cn.edu.cqut.advisorplatform.riskcontrol.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

  @NotNull(message = "userId不能为空")
  private Long userId;

  private String sessionId;

  @NotBlank(message = "eventType不能为空")
  private String eventType;

  @NotBlank(message = "eventName不能为空")
  private String eventName;

  private String pageUrl;

  private String elementId;

  private String ipAddress;

  private String userAgent;

  private String extraData;

  private Long timestamp;
}
