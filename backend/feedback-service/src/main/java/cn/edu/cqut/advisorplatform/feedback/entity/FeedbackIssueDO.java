package cn.edu.cqut.advisorplatform.feedback.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "feedback_issue")
public class FeedbackIssueDO {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 256)
  private String title;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private FeedbackIssueStatus status = FeedbackIssueStatus.OPEN;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private GitHubSyncStatus githubSyncStatus = GitHubSyncStatus.PENDING;

  private Long githubIssueNumber;

  @Column(length = 512)
  private String githubIssueUrl;

  @Column(length = 32)
  private String githubState;

  private LocalDateTime githubLastSyncedAt;

  @Column(columnDefinition = "TEXT")
  private String closeReason;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by")
  private UserDO createdBy;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "closed_by")
  private UserDO closedBy;

  @Column(updatable = false)
  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;

  private LocalDateTime closedAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
