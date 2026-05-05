package cn.edu.cqut.advisorplatform.riskcontrol.dto;

import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskCheckRequest {

  private Long userId;
  private String sessionId;
  private String ipAddress;
  private String requestPath;
  private String requestBody;
  private String eventType;
  private String content;

  @Builder.Default private RiskDirection direction = RiskDirection.INPUT;
}
