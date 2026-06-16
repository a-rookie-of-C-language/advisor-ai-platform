package cn.edu.cqut.advisorplatform.feedback.dto;

import cn.edu.cqut.advisorplatform.feedback.entity.GitHubSyncStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IssueCommentResponseDTO {

  private Long id;
  private String content;
  private GitHubSyncStatus githubSyncStatus;
  private Long githubCommentId;
  private String githubCommentUrl;
  private Long createdById;
  private String createdByUsername;
  private String createdByRealName;
  private LocalDateTime createdAt;
}
