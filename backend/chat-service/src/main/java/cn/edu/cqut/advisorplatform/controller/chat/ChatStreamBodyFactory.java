package cn.edu.cqut.advisorplatform.controller.chat;

import cn.edu.cqut.advisorplatform.dto.request.chat.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@Slf4j
class ChatStreamBodyFactory {

  private static final String FAILURE_MESSAGE_PREFIX = "\u8bf7\u6c42\u5931\u8d25\uff1a";

  StreamingResponseBody create(
      ChatStreamRequestDTO request,
      Long userId,
      String traceId,
      String turnId,
      String userText,
      String assistantErrorPlaceholder,
      AgentProxyService agentProxyService,
      ChatMessageService chatMessageService,
      SseResponseWriter sseResponseWriter,
      ChatTurnPersistenceSupport turnPersistenceSupport,
      ChatControllerSupport support) {
    return outputStream -> {
      long startAt = System.currentTimeMillis();
      LogTraceUtil.put(traceId, request.getSessionId(), turnId, userId);
      String assistantText = assistantErrorPlaceholder;
      List<SourceReference> sources = List.of();
      List<StreamEventRecord> events = List.of();
      String finishReason = "stop";
      try {
        log.info("chat_stream start");
        ChatStreamProxyResult proxyResult =
            agentProxyService.proxyChatStream(request, userId, outputStream);
        assistantText = resolveAssistantText(proxyResult, assistantErrorPlaceholder);
        sources = resolveSources(proxyResult);
        events = resolveEvents(proxyResult);
        log.info(
            "chat_stream proxy_done, assistantLen={}, elapsedMs={}",
            assistantText.length(),
            support.elapsedSince(startAt));
      } catch (Exception ex) {
        String errorMessage = support.safeMessage(ex, assistantErrorPlaceholder);
        finishReason = "error";
        sseResponseWriter.writeErrorEvent(outputStream, errorMessage);
        log.warn("chat_stream proxy_failed, reason={}", LogTraceUtil.preview(errorMessage));
        assistantText = FAILURE_MESSAGE_PREFIX + errorMessage;
      } finally {
        sseResponseWriter.writeDoneEvent(outputStream, finishReason, turnId, traceId);
        turnPersistenceSupport.saveTurnQuietly(
            chatMessageService,
            request.getSessionId(),
            userId,
            turnId,
            userText,
            assistantText,
            sources,
            events);
        log.info(
            "chat_stream done, assistantLen={}, elapsedMs={}",
            assistantText.length(),
            support.elapsedSince(startAt));
        LogTraceUtil.clear();
      }
    };
  }

  private String resolveAssistantText(
      ChatStreamProxyResult proxyResult, String assistantErrorPlaceholder) {
    if (proxyResult == null
        || proxyResult.getAssistantText() == null
        || proxyResult.getAssistantText().isBlank()) {
      return assistantErrorPlaceholder;
    }
    return proxyResult.getAssistantText().trim();
  }

  private List<SourceReference> resolveSources(ChatStreamProxyResult proxyResult) {
    if (proxyResult == null || proxyResult.getSources() == null) {
      return List.of();
    }
    return proxyResult.getSources();
  }

  private List<StreamEventRecord> resolveEvents(ChatStreamProxyResult proxyResult) {
    if (proxyResult == null || proxyResult.getEvents() == null) {
      return List.of();
    }
    return proxyResult.getEvents();
  }
}
