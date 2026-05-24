package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.client.RagServiceClient;
import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.service.ChatService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

  private final ChatSessionDao chatSessionDao;
  private final ChatMessageDao chatMessageDao;
  private final RagServiceClient ragServiceClient;
  private ChatSessionSupport chatSessionSupport;

  @Override
  public List<Map<String, Object>> listSessions(
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    Long userId = support().requireUserId(currentUser);
    return chatSessionDao.findByUserIdOrderByUpdatedAtDesc(userId).stream()
        .map(support()::toSessionMap)
        .toList();
  }

  @Override
  @Transactional
  public Map<String, Object> createSession(
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    ChatSessionDO session = new ChatSessionDO();
    session.setUser(support().toUserReference(support().requireUser(currentUser)));
    session.setTitle("???");
    session.setKbId(0L);
    java.time.LocalDateTime now = java.time.LocalDateTime.now();
    session.setCreatedAt(now);
    session.setUpdatedAt(now);
    ChatSessionDO saved = chatSessionDao.save(session);
    return support().toSessionMap(saved);
  }

  @Override
  @Transactional
  public void deleteSession(
      Long sessionId,
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    ChatSessionDO session = getOwnedSession(sessionId, currentUser);
    chatSessionDao.deleteById(session.getId());
  }

  @Override
  @Transactional
  public Map<String, Object> updateSessionKb(
      Long sessionId,
      Long kbId,
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    ChatSessionDO session = getSessionForLoggedInUser(sessionId, currentUser);
    if (kbId == null || kbId <= 0) {
      session.setKbId(0L);
    } else {
      if (!support().existsKnowledgeBase(kbId)) {
        throw new cn.edu.cqut.advisorplatform.common.exception.NotFoundException("知识库不存在");
      }
      session.setKbId(kbId);
    }
    session.setUpdatedAt(java.time.LocalDateTime.now());
    return support().toSessionMap(chatSessionDao.save(session));
  }

  @Override
  public List<Map<String, Object>> listMessages(
      Long sessionId,
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    getOwnedSession(sessionId, currentUser);
    return chatMessageDao.findBySessionIdOrderByCreatedAtAscIdAsc(sessionId).stream()
        .map(support()::toMessageMap)
        .toList();
  }

  @Override
  public long getSessionKbId(
      Long sessionId,
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    ChatSessionDO session = getSessionForLoggedInUser(sessionId, currentUser);
    Long kbId = session.getKbId();
    return kbId == null ? 0L : kbId;
  }

  private ChatSessionDO getSessionForLoggedInUser(
      Long sessionId,
      @Nullable cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    support().requireUserId(currentUser);
    return chatSessionDao
        .findById(sessionId)
        .orElseThrow(
            () -> new cn.edu.cqut.advisorplatform.common.exception.NotFoundException("会话不存在"));
  }

  private ChatSessionDO getOwnedSession(
      Long sessionId, cn.edu.cqut.advisorplatform.common.security.UserPrincipal currentUser) {
    ChatSessionDO session = getSessionForLoggedInUser(sessionId, currentUser);
    Long currentUserId = support().requireUserId(currentUser);
    Long ownerId = session.getUser() == null ? null : session.getUser().getId();
    if (ownerId == null || !ownerId.equals(currentUserId)) {
      throw new cn.edu.cqut.advisorplatform.common.exception.ForbiddenException("无权访问该会话");
    }
    return session;
  }

  private ChatSessionSupport support() {
    if (chatSessionSupport == null) {
      chatSessionSupport = new ChatSessionSupport(ragServiceClient);
    }
    return chatSessionSupport;
  }
}
