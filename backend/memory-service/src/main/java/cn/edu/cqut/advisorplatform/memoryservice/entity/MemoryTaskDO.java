package cn.edu.cqut.advisorplatform.memoryservice.entity;

import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MemoryTaskDO {

  private Long id;

  private Long userId;

  private Long kbId;

  private Long sessionId;

  private String turnId;

  private String status = "pending";

  private Map<String, Object> payload = new java.util.HashMap<>();

  private Integer retryCount = 0;

  private String errorMessage;

  private LocalDateTime createdAt;

  private LocalDateTime processedAt;
}
