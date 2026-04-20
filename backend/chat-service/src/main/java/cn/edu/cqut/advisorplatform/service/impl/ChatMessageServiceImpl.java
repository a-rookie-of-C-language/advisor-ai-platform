package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO.SourceReference;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageServiceImpl implements ChatMessageService {

  private static final String ROLE_USER = "user";
  private static final String ROLE_ASSISTANT = "assistant";
  private static final String DEFAULT_TITLE = "新对话";
  private static final String ASSISTANT_ERROR_PLACEHOLDER = "请求失败，请稍后重试。";

  private final ChatMessageDao chatMessageDao;
  private final ChatSessionDao chatSessionDao;

  @Override
  @Transactional
  public void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<SourceReference> sources) {
    ChatSessionDO session = getOwnedSession(sessionId, userId);

    String safeTurnId = turnId == null ? "" : turnId.trim();
    if (safeTurnId.isBlank()) {
      log.warn("chat_persist skip_blank_turn");
      return;
    }

    if (chatMessageDao.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_ASSISTANT)) {
      log.info("chat_persist idempotent_hit, role=assistant");
      return;
    }

    String safeUserContent = userContent == null ? "" : userContent.trim();
    String safeAssistantContent = assistantContent == null ? "" : assistantContent.trim();
    if (safeAssistantContent.isBlank()) {
      safeAssistantContent = ASSISTANT_ERROR_PLACEHOLDER;
    }

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime assistantCreatedAt = now.plusNanos(1);

    boolean firstUserMessage = !chatMessageDao.existsBySessionIdAndRole(sessionId, ROLE_USER);
    boolean shouldInitTitle =
        firstUserMessage && !safeUserContent.isBlank() && isDefaultTitle(session.getTitle());

    if (!safeUserContent.isBlank()
        && !chatMessageDao.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_USER)) {
      insertMessage(session, safeTurnId, ROLE_USER, safeUserContent, null, now);
    }

    if (!chatMessageDao.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_ASSISTANT)) {
      insertMessage(
          session, safeTurnId, ROLE_ASSISTANT, safeAssistantContent, sources, assistantCreatedAt);
    }

    if (shouldInitTitle) {
      String title = buildTitle(safeUserContent);
      session.setTitle(title);
      log.info("chat_persist update_title, titlePreview={}", LogTraceUtil.preview(title));
    }
    session.setUpdatedAt(now);
    chatSessionDao.save(session);
    log.info(
        "chat_persist done, userLen={}, assistantLen={}",
        safeUserContent.length(),
        safeAssistantContent.length());
  }

  @Override
  @Transactional(readOnly = true)
  public String findAssistantContent(Long sessionId, Long userId, @Nullable String turnId) {
    ChatSessionDO session = getOwnedSession(sessionId, userId);
    String safeTurnId = turnId == null ? "" : turnId.trim();
    if (safeTurnId.isBlank()) {
      return null;
    }
    String content =
        chatMessageDao
            .findFirstBySessionIdAndTurnIdAndRole(session.getId(), safeTurnId, ROLE_ASSISTANT)
            .map(ChatMessageDO::getContent)
            .orElse(null);
    if (content != null && !content.isBlank()) {
      log.info("chat_persist cache_hit, assistantLen={}", content.length());
    }
    return content;
  }

  private ChatSessionDO getOwnedSession(Long sessionId, Long userId) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    Long ownerId = session.getUser() == null ? null : session.getUser().getId();
    if (ownerId == null || !ownerId.equals(userId)) {
      throw new ForbiddenException("无权访问该会话");
    }
    return session;
  }

  private void insertMessage(
      ChatSessionDO session,
      String turnId,
      String role,
      String content,
      @Nullable java.util.List<ChatMessageDO.SourceReference> sources,
      LocalDateTime createdAt) {
    ChatMessageDO message = new ChatMessageDO();
    message.setSession(session);
    message.setTurnId(turnId);
    message.setRole(role);
    message.setContent(content);
    message.setSources(sources);
    message.setCreatedAt(createdAt);
    try {
      chatMessageDao.save(message);
      log.info(
          "chat_persist save_message, role={}, contentLen={}, preview={}",
          role,
          content == null ? 0 : content.length(),
          LogTraceUtil.preview(content));
    } catch (DataIntegrityViolationException ignored) {
      log.info("chat_persist idempotent_conflict, role={}", role);
    }
  }

  private boolean isDefaultTitle(String title) {
    if (title == null) {
      return true;
    }
    String normalized = title.trim();
    return normalized.isEmpty() || DEFAULT_TITLE.equals(normalized);
  }

  private String buildTitle(String userContent) {
    int limit = Math.min(5, userContent.length());
    return userContent.substring(0, limit);
  }

  public void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent) {
    saveTurn(sessionId, userId, turnId, userContent, assistantContent, null);
  }
}
