package cn.edu.cqut.advisorplatform.feedback.service.impl;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueCommentResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueCommentDO;
import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueDO;
import cn.edu.cqut.advisorplatform.feedback.entity.UserDO;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class FeedbackIssueMapper {

  public IssueResponseDTO toIssueResponse(
      FeedbackIssueDO issue, List<FeedbackIssueCommentDO> comments, UserPrincipal currentUser) {
    UserDO createdBy = issue.getCreatedBy();
    UserDO closedBy = issue.getClosedBy();
    return IssueResponseDTO.builder()
        .id(issue.getId())
        .title(issue.getTitle())
        .content(issue.getContent())
        .status(issue.getStatus())
        .githubSyncStatus(issue.getGithubSyncStatus())
        .githubIssueNumber(issue.getGithubIssueNumber())
        .githubIssueUrl(issue.getGithubIssueUrl())
        .githubState(issue.getGithubState())
        .githubLastSyncedAt(issue.getGithubLastSyncedAt())
        .closeReason(issue.getCloseReason())
        .createdById(createdBy == null ? null : createdBy.getId())
        .createdByUsername(createdBy == null ? null : createdBy.getUsername())
        .createdByRealName(createdBy == null ? null : createdBy.getRealName())
        .closedById(closedBy == null ? null : closedBy.getId())
        .closedByUsername(closedBy == null ? null : closedBy.getUsername())
        .createdAt(issue.getCreatedAt())
        .updatedAt(issue.getUpdatedAt())
        .closedAt(issue.getClosedAt())
        .canClose(canClose(issue, currentUser))
        .comments(comments == null ? null : comments.stream().map(this::toCommentResponse).toList())
        .build();
  }

  public IssueCommentResponseDTO toCommentResponse(FeedbackIssueCommentDO comment) {
    UserDO createdBy = comment.getCreatedBy();
    return IssueCommentResponseDTO.builder()
        .id(comment.getId())
        .content(comment.getContent())
        .githubSyncStatus(comment.getGithubSyncStatus())
        .githubCommentId(comment.getGithubCommentId())
        .githubCommentUrl(comment.getGithubCommentUrl())
        .createdById(createdBy == null ? null : createdBy.getId())
        .createdByUsername(createdBy == null ? null : createdBy.getUsername())
        .createdByRealName(createdBy == null ? null : createdBy.getRealName())
        .createdAt(comment.getCreatedAt())
        .build();
  }

  private boolean canClose(FeedbackIssueDO issue, UserPrincipal currentUser) {
    if (currentUser == null || issue == null) {
      return false;
    }
    if ("ADMIN".equals(currentUser.getRole().name())) {
      return true;
    }
    UserDO createdBy = issue.getCreatedBy();
    return createdBy != null && createdBy.getId().equals(currentUser.getId());
  }
}
