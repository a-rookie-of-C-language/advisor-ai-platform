package cn.edu.cqut.advisorplatform.service.impl.chat;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageServiceImpl implements ChatMessageService {

  private final ChatMessageDao chatMessageDao;
  private final ChatSessionOwnershipSupport sessionOwnershipSupport;
  private final ChatMessageTurnPersistenceSupport turnPersistenceSupport;

  @Override
  @Transactional
  public void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<SourceReference> sources,
      @Nullable List<StreamEventRecord> events) {
    ChatSessionDO session = sessionOwnershipSupport.getOwnedSession(sessionId, userId);
    turnPersistenceSupport.saveTurn(
        session, turnId, userContent, assistantContent, sources, events);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<String> findAssistantContent(
      Long sessionId, Long userId, @Nullable String turnId) {
    ChatSessionDO session = sessionOwnershipSupport.getOwnedSession(sessionId, userId);
    String safeTurnId = turnId == null ? "" : turnId.trim();
    if (safeTurnId.isBlank()) {
      return Optional.empty();
    }
    String content =
        chatMessageDao
            .findFirstBySessionIdAndTurnIdAndRole(
                session.getId(), safeTurnId, ChatMessageRoles.ASSISTANT)
            .map(ChatMessageDO::getContent)
            .orElse(null);
    if (content != null && !content.isBlank()) {
      log.info("chat_persist cache_hit, assistantLen={}", content.length());
      return Optional.of(content);
    }
    return Optional.empty();
  }

  public void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent) {
    saveTurn(sessionId, userId, turnId, userContent, assistantContent, null, null);
  }
}
