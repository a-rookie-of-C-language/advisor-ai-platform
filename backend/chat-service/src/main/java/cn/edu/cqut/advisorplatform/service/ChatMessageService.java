package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.Nullable;

public interface ChatMessageService {

  void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<SourceReference> sources,
      @Nullable List<StreamEventRecord> events);

  default void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<SourceReference> sources) {
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

  Optional<String> findAssistantContent(Long sessionId, Long userId, @Nullable String turnId);
}
