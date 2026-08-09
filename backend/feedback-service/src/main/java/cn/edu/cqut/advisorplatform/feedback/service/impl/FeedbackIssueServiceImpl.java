package cn.edu.cqut.advisorplatform.feedback.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.feedback.dao.FeedbackIssueCommentDao;
import cn.edu.cqut.advisorplatform.feedback.dao.FeedbackIssueDao;
import cn.edu.cqut.advisorplatform.feedback.dao.UserDao;
import cn.edu.cqut.advisorplatform.feedback.dto.CloseIssueRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CreateCommentRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CreateIssueRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueCommentResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueCommentDO;
import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueDO;
import cn.edu.cqut.advisorplatform.feedback.entity.FeedbackIssueStatus;
import cn.edu.cqut.advisorplatform.feedback.entity.GitHubSyncStatus;
import cn.edu.cqut.advisorplatform.feedback.entity.UserDO;
import cn.edu.cqut.advisorplatform.feedback.github.GitHubClient;
import cn.edu.cqut.advisorplatform.feedback.github.GitHubCommentResponse;
import cn.edu.cqut.advisorplatform.feedback.github.GitHubIssueResponse;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackIssueServiceImpl
    implements cn.edu.cqut.advisorplatform.feedback.service.FeedbackIssueService {

  private final FeedbackIssueDao issueDao;
  private final FeedbackIssueCommentDao commentDao;
  private final UserDao userDao;
  private final GitHubClient gitHubClient;
  private final FeedbackIssueMapper mapper;

  @Override
  @Transactional
  public List<IssueResponseDTO> listIssues(UserPrincipal currentUser) {
    return issueDao.findAllByOrderByUpdatedAtDesc().stream()
        .map(this::syncGitHubStateIfPossible)
        .map(issue -> mapper.toIssueResponse(issue, null, currentUser))
        .toList();
  }

  @Override
  @Transactional
  public IssueResponseDTO getIssue(Long id, UserPrincipal currentUser) {
    FeedbackIssueDO issue = syncGitHubStateIfPossible(findIssue(id));
    List<FeedbackIssueCommentDO> comments = commentDao.findByIssueIdOrderByCreatedAtAsc(id);
    return mapper.toIssueResponse(issue, comments, currentUser);
  }

  @Override
  @Transactional
  public IssueResponseDTO createIssue(CreateIssueRequestDTO request, UserPrincipal currentUser) {
    UserDO user = findCurrentUser(currentUser);
    FeedbackIssueDO issue = new FeedbackIssueDO();
    issue.setTitle(request.getTitle().trim());
    issue.setContent(request.getContent().trim());
    issue.setCreatedBy(user);
    issue = issueDao.save(issue);
    syncCreatedIssue(issue, user);
    return mapper.toIssueResponse(issue, List.of(), currentUser);
  }

  @Override
  @Transactional
  public IssueCommentResponseDTO createComment(
      Long issueId, CreateCommentRequestDTO request, UserPrincipal currentUser) {
    UserDO user = findCurrentUser(currentUser);
    FeedbackIssueDO issue = findIssue(issueId);
    FeedbackIssueCommentDO comment = new FeedbackIssueCommentDO();
    comment.setIssue(issue);
    comment.setContent(request.getContent().trim());
    comment.setCreatedBy(user);
    comment = commentDao.save(comment);
    syncCreatedComment(issue, comment, user);
    return mapper.toCommentResponse(comment);
  }

  @Override
  @Transactional
  public IssueResponseDTO closeIssue(
      Long issueId, CloseIssueRequestDTO request, UserPrincipal currentUser) {
    UserDO user = findCurrentUser(currentUser);
    FeedbackIssueDO issue = findIssue(issueId);
    if (!canClose(issue, currentUser)) {
      throw new ForbiddenException("只有管理员或 issue 发起人可以关闭");
    }
    String reason = request.getReason() == null ? "" : request.getReason().trim();
    if (reason.isBlank()) {
      throw new BadRequestException("关闭理由不能为空");
    }
    issue.setStatus(FeedbackIssueStatus.CLOSED);
    issue.setCloseReason(reason);
    issue.setClosedBy(user);
    issue.setClosedAt(LocalDateTime.now());
    syncClosedIssue(issue, user, reason);
    List<FeedbackIssueCommentDO> comments = commentDao.findByIssueIdOrderByCreatedAtAsc(issueId);
    return mapper.toIssueResponse(issue, comments, currentUser);
  }

  private FeedbackIssueDO syncGitHubStateIfPossible(FeedbackIssueDO issue) {
    if (!gitHubClient.isConfigured() || issue.getGithubIssueNumber() == null) {
      return issue;
    }
    try {
      GitHubIssueResponse response = gitHubClient.getIssue(issue.getGithubIssueNumber());
      if (response != null) {
        applyGitHubIssue(issue, response);
      }
    } catch (RuntimeException ex) {
      log.warn("Sync GitHub issue state failed, localIssueId={}", issue.getId(), ex);
      issue.setGithubSyncStatus(GitHubSyncStatus.FAILED);
    }
    return issue;
  }

  private void syncCreatedIssue(FeedbackIssueDO issue, UserDO user) {
    if (!gitHubClient.isConfigured()) {
      issue.setGithubSyncStatus(GitHubSyncStatus.PENDING);
      return;
    }
    try {
      GitHubIssueResponse response =
          gitHubClient.createIssue(issue.getTitle(), buildIssueBody(issue, user));
      applyGitHubIssue(issue, response);
    } catch (RuntimeException ex) {
      log.warn("Create GitHub issue failed, localIssueId={}", issue.getId(), ex);
      issue.setGithubSyncStatus(GitHubSyncStatus.FAILED);
    }
  }

  private void syncCreatedComment(
      FeedbackIssueDO issue, FeedbackIssueCommentDO comment, UserDO user) {
    if (!gitHubClient.isConfigured() || issue.getGithubIssueNumber() == null) {
      comment.setGithubSyncStatus(GitHubSyncStatus.PENDING);
      return;
    }
    try {
      GitHubCommentResponse response =
          gitHubClient.createComment(issue.getGithubIssueNumber(), buildCommentBody(comment, user));
      if (response != null) {
        comment.setGithubCommentId(response.getId());
        comment.setGithubCommentUrl(response.getHtmlUrl());
        comment.setGithubSyncStatus(GitHubSyncStatus.SYNCED);
      }
    } catch (RuntimeException ex) {
      log.warn("Create GitHub comment failed, localCommentId={}", comment.getId(), ex);
      comment.setGithubSyncStatus(GitHubSyncStatus.FAILED);
    }
  }

  private void syncClosedIssue(FeedbackIssueDO issue, UserDO user, String reason) {
    if (!gitHubClient.isConfigured() || issue.getGithubIssueNumber() == null) {
      return;
    }
    try {
      gitHubClient.createComment(issue.getGithubIssueNumber(), buildCloseBody(user, reason));
      GitHubIssueResponse response = gitHubClient.closeIssue(issue.getGithubIssueNumber());
      applyGitHubIssue(issue, response);
    } catch (RuntimeException ex) {
      log.warn("Close GitHub issue failed, localIssueId={}", issue.getId(), ex);
      issue.setGithubSyncStatus(GitHubSyncStatus.FAILED);
    }
  }

  private void applyGitHubIssue(FeedbackIssueDO issue, GitHubIssueResponse response) {
    if (response == null) {
      return;
    }
    issue.setGithubIssueNumber(response.getNumber());
    issue.setGithubIssueUrl(response.getHtmlUrl());
    issue.setGithubState(response.getState());
    issue.setGithubLastSyncedAt(LocalDateTime.now());
    issue.setGithubSyncStatus(GitHubSyncStatus.SYNCED);
    if ("closed".equalsIgnoreCase(response.getState())) {
      issue.setStatus(FeedbackIssueStatus.CLOSED);
      if (issue.getClosedAt() == null) {
        issue.setClosedAt(LocalDateTime.now());
      }
    } else if (issue.getStatus() != FeedbackIssueStatus.CLOSED) {
      issue.setStatus(FeedbackIssueStatus.OPEN);
    }
  }

  private FeedbackIssueDO findIssue(Long id) {
    return issueDao.findById(id).orElseThrow(() -> new NotFoundException("Issue 不存在"));
  }

  private UserDO findCurrentUser(UserPrincipal currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("请先登录");
    }
    return userDao
        .findById(currentUser.getId())
        .orElseThrow(() -> new NotFoundException("当前用户不存在"));
  }

  private boolean canClose(FeedbackIssueDO issue, UserPrincipal currentUser) {
    if (currentUser == null || currentUser.getRole() == null) {
      return false;
    }
    if ("ADMIN".equals(currentUser.getRole().name())) {
      return true;
    }
    UserDO createdBy = issue.getCreatedBy();
    return createdBy != null && createdBy.getId().equals(currentUser.getId());
  }

  private String buildIssueBody(FeedbackIssueDO issue, UserDO user) {
    return "Reporter: "
        + displayUser(user)
        + "\n\n"
        + "Local issue id: "
        + issue.getId()
        + "\n\n"
        + issue.getContent();
  }

  private String buildCommentBody(FeedbackIssueCommentDO comment, UserDO user) {
    return "Comment from "
        + displayUser(user)
        + "\n\n"
        + "Local comment id: "
        + comment.getId()
        + "\n\n"
        + comment.getContent();
  }

  private String buildCloseBody(UserDO user, String reason) {
    return "Closed from advisor-ai-platform by " + displayUser(user) + ".\n\nReason:\n" + reason;
  }

  private String displayUser(UserDO user) {
    if (user == null) {
      return "unknown";
    }
    return user.getRealName() + " (@" + user.getUsername() + ")";
  }
}
