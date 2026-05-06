package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@Entity
@Table(name = "user_memory")
public class UserMemoryDO {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false)
  private Long kbId;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Column(nullable = false, precision = 4, scale = 3)
  private BigDecimal confidence = BigDecimal.valueOf(0.7);

  @Column(nullable = false, precision = 6, scale = 4)
  private BigDecimal score = BigDecimal.ZERO;

  @Column(length = 128)
  private String memoryKey;

  @Column(length = 64)
  private String sourceTurnId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> tags;

  @Column(nullable = false)
  private Boolean isDeleted = false;

  private LocalDateTime expiresAt;

  @Column(updatable = false)
  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;

  @Column(nullable = false)
  private Integer accessCount = 0;

  private LocalDateTime lastAccessedAt;
}
