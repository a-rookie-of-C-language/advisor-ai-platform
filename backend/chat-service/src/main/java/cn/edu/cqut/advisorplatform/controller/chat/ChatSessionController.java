package cn.edu.cqut.advisorplatform.controller.chat;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.audit.AuditAction;
import cn.edu.cqut.advisorplatform.entity.audit.AuditModule;
import cn.edu.cqut.advisorplatform.service.chat.ChatService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat/sessions")
@RequiredArgsConstructor
public class ChatSessionController {

  private final ChatService chatService;
  private final ChatRequestAuditContext auditContext = new ChatRequestAuditContext();

  @GetMapping
  @Auditable(
      module = AuditModule.CHAT,
      action = AuditAction.QUERY,
      logRequestParams = false,
      logResponseData = false)
  public ApiResponseDTO<List<Map<String, Object>>> listSessions(
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    return ApiResponseDTO.success(chatService.listSessions(currentUser));
  }

  @PostMapping
  @Auditable(
      module = AuditModule.CHAT,
      action = AuditAction.STORE,
      logRequestParams = false,
      logResponseData = false)
  public ApiResponseDTO<Map<String, Object>> createSession(
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    return ApiResponseDTO.success(chatService.createSession(currentUser));
  }

  @DeleteMapping("/{id}")
  @Auditable(
      module = AuditModule.CHAT,
      action = AuditAction.DELETE,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<Void> deleteSession(
      @PathVariable("id") Long id, @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    auditContext.attach(null, id, null);
    chatService.deleteSession(id, currentUser);
    return ApiResponseDTO.success();
  }

  @GetMapping("/{sessionId}/messages")
  @Auditable(
      module = AuditModule.CHAT,
      action = AuditAction.QUERY,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<List<Map<String, Object>>> listMessages(
      @PathVariable("sessionId") Long sessionId,
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    auditContext.attach(null, sessionId, null);
    return ApiResponseDTO.success(chatService.listMessages(sessionId, currentUser));
  }
}
