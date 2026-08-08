package cn.edu.cqut.advisorplatform.controller.chat;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.service.ChatService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class ChatOnceResponseHandler {

  private static final String FAILURE_MESSAGE_PREFIX = "\u8bf7\u6c42\u5931\u8d25\uff1a";

  Map<String, Object> handle(
      Long sessionId,
      Map<String, String> body,
      UserPrincipal currentUser,
      String assistantErrorPlaceholder,
      AgentProxyService agentProxyService,
      ChatService chatService,
      ChatMessageService chatMessageService,
      ChatTurnIdGenerator turnIdGenerator,
      ChatRequestAuditContext auditContext,
      ChatTurnPersistenceSupport turnPersistenceSupport,
      ChatControllerSupport support) {
    String userContent = body == null ? "" : body.getOrDefault("content", "").trim();
    if (userContent.isBlank()) {
      throw new BadRequestException("content is blank");
    }

    long startAt = System.currentTimeMillis();
    List<ChatStreamMessageDTO> history =
        support.buildHistoryMessages(chatService.listMessages(sessionId, currentUser), userContent);

    ChatStreamRequestDTO request = new ChatStreamRequestDTO();
    request.setSessionId(sessionId);
    request.setMessages(history);

    Long userId = currentUser.getId();
    String turnId = turnIdGenerator.build(request, userId);
    String traceId = auditContext.resolveTraceIdFromRequest();
    auditContext.attach(traceId, sessionId, turnId);

    LogTraceUtil.put(traceId, sessionId, turnId, userId);
    try {
      log.info(
          "chat_send start, messageCount={}, userLen={}, userPreview={}",
          history.size(),
          userContent.length(),
          LogTraceUtil.preview(userContent));

      Optional<String> cached = chatMessageService.findAssistantContent(sessionId, userId, turnId);
      if (cached.isPresent()) {
        String assistantText = cached.get();
        log.info(
            "chat_send cache_hit, assistantLen={}, elapsedMs={}",
            assistantText.length(),
            support.elapsedSince(startAt));
        return support.buildAssistantResponse(assistantText, List.of(), List.of());
      }

      request.setKbId(chatService.getSessionKbId(sessionId, currentUser));
      ChatOnceProxyResult proxyResult =
          proxyOnce(agentProxyService, request, userId, assistantErrorPlaceholder);
      String assistantText = proxyResult.assistantText();
      List<SourceReference> sources = proxyResult.sources();
      List<StreamEventRecord> events = proxyResult.events();

      turnPersistenceSupport.saveTurn(
          chatMessageService,
          sessionId,
          userId,
          turnId,
          userContent,
          assistantText,
          sources,
          events);
      log.info(
          "chat_send done, assistantLen={}, elapsedMs={}",
          assistantText.length(),
          support.elapsedSince(startAt));
      return support.buildAssistantResponse(assistantText, sources, events);
    } finally {
      LogTraceUtil.clear();
    }
  }

  private ChatOnceProxyResult proxyOnce(
      AgentProxyService agentProxyService,
      ChatStreamRequestDTO request,
      Long userId,
      String assistantErrorPlaceholder) {
    String assistantText;
    List<SourceReference> sources = List.of();
    List<StreamEventRecord> events = List.of();
    try {
      ChatStreamProxyResult result = agentProxyService.proxyChatOnce(request, userId);
      assistantText = result == null ? "" : result.getAssistantText();
      sources = result == null || result.getSources() == null ? List.of() : result.getSources();
      events = result == null || result.getEvents() == null ? List.of() : result.getEvents();
    } catch (Exception e) {
      String errorMessage = safeMessage(e, assistantErrorPlaceholder);
      assistantText = FAILURE_MESSAGE_PREFIX + errorMessage;
      log.warn("chat_send proxy_failed, reason={}", LogTraceUtil.preview(errorMessage));
    }

    if (assistantText == null || assistantText.trim().isBlank()) {
      assistantText = assistantErrorPlaceholder;
    }
    return new ChatOnceProxyResult(assistantText, sources, events);
  }

  private String safeMessage(Exception exception, String fallback) {
    String message = exception.getMessage();
    return message == null || message.isBlank() ? fallback : message;
  }
}
