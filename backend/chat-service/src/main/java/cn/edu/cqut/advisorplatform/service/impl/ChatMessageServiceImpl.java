package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO.SourceReference;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.mapper.ChatMessageMapper;
import cn.edu.cqut.advisorplatform.mapper.ChatSessionMapper;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
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

  private final ChatMessageMapper chatMessageMapper;
  private final ChatSessionMapper chatSessionMapper;

  @Override
  @Transactional
  public void saveTurn(Long sessionId, Long userId, @Nullable String turnId, @Nullable String userContent, @Nullable String assistantContent, @Nullable List<SourceReference> sources) {
    ChatSessionDO session = getOwnedSession(sessionId, userId);
    String safeTurnId = turnId == null ? "" : turnId.trim();
    if (safeTurnId.isBlank()) return;
    if (chatMessageMapper.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_ASSISTANT)) return;

    String safeUserContent = userContent == null ? "" : userContent.trim();
    String safeAssistantContent = assistantContent == null ? "" : assistantContent.trim();
    if (safeAssistantContent.isBlank()) safeAssistantContent = ASSISTANT_ERROR_PLACEHOLDER;

    LocalDateTime now = LocalDateTime.now();
    boolean firstUserMessage = !chatMessageMapper.existsBySessionIdAndRole(sessionId, ROLE_USER);
    boolean shouldInitTitle = firstUserMessage && !safeUserContent.isBlank() && isDefaultTitle(session.getTitle());

    if (!safeUserContent.isBlank() && !chatMessageMapper.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_USER)) {
      insertMessage(sessionId, userId, safeTurnId, ROLE_USER, safeUserContent, null, now);
    }
    if (!chatMessageMapper.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_ASSISTANT)) {
      insertMessage(sessionId, userId, safeTurnId, ROLE_ASSISTANT, safeAssistantContent, sources, now.plusNanos(1));
    }

    if (shouldInitTitle) session.setTitle(buildTitle(safeUserContent));
    session.setUpdatedAt(now);
    chatSessionMapper.update(session);
  }

  @Override
  @Transactional(readOnly = true)
  public String findAssistantContent(Long sessionId, Long userId, @Nullable String turnId) {
    ChatSessionDO session = getOwnedSession(sessionId, userId);
    String safeTurnId = turnId == null ? "" : turnId.trim();
    if (safeTurnId.isBlank()) return null;
    ChatMessageDO message = chatMessageMapper.selectFirstBySessionIdAndTurnIdAndRole(session.getId(), safeTurnId, ROLE_ASSISTANT);
    return message != null ? message.getContent() : null;
  }

  private ChatSessionDO getOwnedSession(Long sessionId, Long userId) {
    ChatSessionDO session = chatSessionMapper.selectById(sessionId);
    if (session == null) throw new NotFoundException("会话不存在");
    if (session.getUserId() == null || !session.getUserId().equals(userId)) throw new ForbiddenException("无权访问该会话");
    return session;
  }

  private void insertMessage(Long sessionId, Long userId, String turnId, String role, String content, @Nullable List<SourceReference> sources, LocalDateTime createdAt) {
    ChatMessageDO message = new ChatMessageDO();
    message.setSessionId(sessionId);
    message.setUserId(userId);
    message.setTurnId(turnId);
    message.setRole(role);
    message.setContent(content);
    message.setSources(sources);
    message.setCreatedAt(createdAt);
    try {
      chatMessageMapper.insert(message);
    } catch (DataIntegrityViolationException ignored) {
      log.debug("idempotent conflict for role={}", role);
    }
  }

  private boolean isDefaultTitle(String title) {
    return title == null || title.trim().isEmpty() || DEFAULT_TITLE.equals(title.trim());
  }

  private String buildTitle(String userContent) {
    int limit = Math.min(5, userContent.length());
    return userContent.substring(0, limit);
  }

  public void saveTurn(Long sessionId, Long userId, @Nullable String turnId, @Nullable String userContent, @Nullable String assistantContent) {
    saveTurn(sessionId, userId, turnId, userContent, assistantContent, null);
  }
}
