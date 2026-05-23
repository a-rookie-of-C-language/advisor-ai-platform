package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import java.util.List;
import org.springframework.lang.Nullable;

public interface ChatMessageService {

  void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<ChatMessageDO.SourceReference> sources,
      @Nullable List<ChatMessageDO.StreamEventRecord> events);

  default void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<ChatMessageDO.SourceReference> sources) {
    saveTurn(sessionId, userId, turnId, userContent, assistantContent, sources, null);
  }

  default void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent) {
    saveTurn(sessionId, userId, turnId, userContent, assistantContent, null, null);
  }

  @Nullable
  String findAssistantContent(Long sessionId, Long userId, @Nullable String turnId);
}
