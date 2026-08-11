package cn.edu.cqut.advisorplatform.feedback.service;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.feedback.dto.CloseIssueRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CreateCommentRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CreateIssueRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueCommentResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueResponseDTO;
import java.util.List;

public interface FeedbackIssueService {

  List<IssueResponseDTO> listIssues(UserPrincipal currentUser);

  IssueResponseDTO getIssue(Long id, UserPrincipal currentUser);

  IssueResponseDTO createIssue(CreateIssueRequestDTO request, UserPrincipal currentUser);

  IssueCommentResponseDTO createComment(
      Long issueId, CreateCommentRequestDTO request, UserPrincipal currentUser);

  IssueResponseDTO closeIssue(
      Long issueId, CloseIssueRequestDTO request, UserPrincipal currentUser);

  IssueResponseDTO retryGitHubSync(Long issueId, UserPrincipal currentUser);
}
