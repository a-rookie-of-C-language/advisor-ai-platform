package cn.edu.cqut.advisorplatform.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class AuthRefreshTokenDO {
  private Long id;
  private Long userId;
  private String tokenHash;
  private LocalDateTime expiresAt;
  private Boolean revoked = false;
  private LocalDateTime revokedAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
