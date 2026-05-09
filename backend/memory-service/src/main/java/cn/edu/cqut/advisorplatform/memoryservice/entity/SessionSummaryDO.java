package cn.edu.cqut.advisorplatform.memoryservice.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SessionSummaryDO {

  private Long id;
  private Long sessionId;
  private String summary;
  private Integer version = 1;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
