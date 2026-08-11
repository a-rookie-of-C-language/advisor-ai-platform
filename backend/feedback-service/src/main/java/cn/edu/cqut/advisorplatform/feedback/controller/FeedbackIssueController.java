package cn.edu.cqut.advisorplatform.feedback.controller;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.feedback.dto.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CloseIssueRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CreateCommentRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.CreateIssueRequestDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueCommentResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.dto.IssueResponseDTO;
import cn.edu.cqut.advisorplatform.feedback.service.FeedbackIssueService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class FeedbackIssueController {

  private final FeedbackIssueService feedbackIssueService;

  @GetMapping
  public ApiResponseDTO<List<IssueResponseDTO>> listIssues(
      @AuthenticationPrincipal UserPrincipal currentUser) {
    return ApiResponseDTO.success(feedbackIssueService.listIssues(currentUser));
  }

  @PostMapping
  public ApiResponseDTO<IssueResponseDTO> createIssue(
      @Valid @RequestBody CreateIssueRequestDTO request,
      @AuthenticationPrincipal UserPrincipal currentUser) {
    return ApiResponseDTO.success(feedbackIssueService.createIssue(request, currentUser));
  }

  @GetMapping("/{id}")
  public ApiResponseDTO<IssueResponseDTO> getIssue(
      @PathVariable("id") Long id, @AuthenticationPrincipal UserPrincipal currentUser) {
    return ApiResponseDTO.success(feedbackIssueService.getIssue(id, currentUser));
  }

  @PostMapping("/{id}/comments")
  public ApiResponseDTO<IssueCommentResponseDTO> createComment(
      @PathVariable("id") Long id,
      @Valid @RequestBody CreateCommentRequestDTO request,
      @AuthenticationPrincipal UserPrincipal currentUser) {
    return ApiResponseDTO.success(feedbackIssueService.createComment(id, request, currentUser));
  }

  @PostMapping("/{id}/close")
  public ApiResponseDTO<IssueResponseDTO> closeIssue(
      @PathVariable("id") Long id,
      @Valid @RequestBody CloseIssueRequestDTO request,
      @AuthenticationPrincipal UserPrincipal currentUser) {
    return ApiResponseDTO.success(feedbackIssueService.closeIssue(id, request, currentUser));
  }
}
