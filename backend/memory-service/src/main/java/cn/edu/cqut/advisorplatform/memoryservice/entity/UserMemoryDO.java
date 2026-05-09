package cn.edu.cqut.advisorplatform.memoryservice.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UserMemoryDO {

  private Long id;
  private Long userId;
  private Long kbId;
  private String content;
  private BigDecimal confidence = BigDecimal.valueOf(0.7);
  private BigDecimal score = BigDecimal.ZERO;
  private String memoryKey;
  private String sourceTurnId;
  private Map<String, Object> tags;
  private Boolean isDeleted = false;
  private LocalDateTime expiresAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Integer accessCount = 0;
  private LocalDateTime lastAccessedAt;
}
