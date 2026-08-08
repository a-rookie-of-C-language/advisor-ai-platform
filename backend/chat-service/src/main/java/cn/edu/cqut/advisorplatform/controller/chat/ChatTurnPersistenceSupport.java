package cn.edu.cqut.advisorplatform.controller.chat;

import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.util.List;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class ChatTurnPersistenceSupport {

  void saveTurn(
      ChatMessageService chatMessageService,
      Long sessionId,
      Long userId,
      String turnId,
      String userText,
      String assistantText,
      List<SourceReference> sources,
      List<StreamEventRecord> events) {
    if ((sources == null || sources.isEmpty()) && (events == null || events.isEmpty())) {
      chatMessageService.saveTurn(sessionId, userId, turnId, userText, assistantText);
      return;
    }
    chatMessageService.saveTurn(
        sessionId, userId, turnId, userText, assistantText, sources, events);
  }

  void saveTurnQuietly(
      ChatMessageService chatMessageService,
      Long sessionId,
      Long userId,
      String turnId,
      String userText,
      String assistantText,
      List<SourceReference> sources,
      List<StreamEventRecord> events) {
    try {
      saveTurn(
          chatMessageService, sessionId, userId, turnId, userText, assistantText, sources, events);
    } catch (Exception e) {
      log.warn("chat_stream save_turn_failed, reason={}", LogTraceUtil.preview(e.getMessage()));
    }
  }
}
