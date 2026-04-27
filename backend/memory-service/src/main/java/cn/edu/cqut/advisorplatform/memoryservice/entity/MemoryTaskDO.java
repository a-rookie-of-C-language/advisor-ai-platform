package cn.edu.cqut.advisorplatform.memoryservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@Entity
@Table(
    name = "memory_task",
    indexes = {
      @Index(name = "idx_memory_task_status", columnList = "status"),
      @Index(name = "idx_memory_task_session_turn", columnList = "sessionId, turnId", unique = true)
    })
public class MemoryTaskDO {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false)
  private Long kbId;

  @Column(nullable = false)
  private Long sessionId;

  @Column(nullable = false, length = 64)
  private String turnId;

  @Column(nullable = false, length = 16)
  private String status = "pending";

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb", nullable = false)
  private Map<String, Object> payload = new java.util.HashMap<>();

  @Column(nullable = false)
  private Integer retryCount = 0;

  private String errorMessage;

  @Column(updatable = false)
  private LocalDateTime createdAt;

  private LocalDateTime processedAt;
}
