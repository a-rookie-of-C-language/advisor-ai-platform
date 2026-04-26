package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "session_summary")
public class SessionSummaryDO {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "session_id", nullable = false, unique = true)
  private ChatSessionDO session;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String summary;

  @Column(nullable = false)
  private Integer version = 1;

  @Column(updatable = false)
  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;
}
