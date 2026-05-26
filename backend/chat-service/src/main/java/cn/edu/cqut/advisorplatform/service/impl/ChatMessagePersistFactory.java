package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.lang.Nullable;

class ChatMessagePersistFactory {

  private static final String DEFAULT_TITLE = "新对话";

  ChatMessageDO createMessage(
      ChatSessionDO session,
      String turnId,
      String role,
      String content,
      @Nullable List<SourceReference> sources,
      @Nullable List<StreamEventRecord> events,
      LocalDateTime createdAt) {
    ChatMessageDO message = new ChatMessageDO();
    message.setSession(session);
    message.setTurnId(turnId);
    message.setRole(role);
    message.setContent(content);
    message.setSources(sources);
    message.setEvents(events);
    message.setCreatedAt(createdAt);
    return message;
  }

  boolean isDefaultTitle(String title) {
    if (title == null) {
      return true;
    }
    String normalized = title.trim();
    return normalized.isEmpty() || DEFAULT_TITLE.equals(normalized);
  }

  String buildTitle(String userContent) {
    int limit = Math.min(5, userContent.length());
    return userContent.substring(0, limit);
  }
}
