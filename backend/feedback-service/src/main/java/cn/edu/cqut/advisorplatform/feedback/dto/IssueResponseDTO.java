package cn.edu.cqut.advisorplatform.feedback.dto;

import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueStatus;
import cn.edu.cqut.advisorplatform.feedback.entity.GitHubSyncStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IssueResponseDTO {

  private Long id;
  private String title;
  private String content;
  private FeedbackIssueStatus status;
  private GitHubSyncStatus githubSyncStatus;
  private Long githubIssueNumber;
  private String githubIssueUrl;
  private String githubState;
  private LocalDateTime githubLastSyncedAt;
  private String closeReason;
  private Long createdById;
  private String createdByUsername;
  private String createdByRealName;
  private Long closedById;
  private String closedByUsername;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private LocalDateTime closedAt;
  private boolean canClose;
  private List<IssueCommentResponseDTO> comments;
  private List<GitHubPullRequestDTO> githubPullRequests;
}
