package cn.edu.cqut.advisorplatform.service.impl.chat;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
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
  private final ChatSessionSupport chatSessionSupport;
  private final ChatSessionMutationSupport sessionMutationSupport;

  @Override
  @Transactional(readOnly = true)
  public List<Map<String, Object>> listSessions(@Nullable UserPrincipal currentUser) {
    Long userId = chatSessionSupport.requireUserId(currentUser);
    return chatSessionDao.findByUserIdOrderByUpdatedAtDesc(userId).stream()
        .map(chatSessionSupport::toSessionMap)
        .toList();
  }

  @Override
  @Transactional
  public Map<String, Object> createSession(@Nullable UserPrincipal currentUser) {
    return sessionMutationSupport.createSession(currentUser);
  }

  @Override
  @Transactional
  public void deleteSession(Long sessionId, @Nullable UserPrincipal currentUser) {
    sessionMutationSupport.deleteSession(sessionId, currentUser);
  }

  @Override
  @Transactional
  public Map<String, Object> updateSessionKb(
      Long sessionId, Long kbId, @Nullable UserPrincipal currentUser) {
    return sessionMutationSupport.updateSessionKb(sessionId, kbId, currentUser);
  }

  @Override
  @Transactional(readOnly = true)
  public List<Map<String, Object>> listMessages(
      Long sessionId, @Nullable UserPrincipal currentUser) {
    sessionMutationSupport.getOwnedSession(sessionId, currentUser);
    return chatMessageDao.findBySessionIdOrderByCreatedAtAscIdAsc(sessionId).stream()
        .map(chatSessionSupport::toMessageMap)
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public long getSessionKbId(Long sessionId, @Nullable UserPrincipal currentUser) {
    return sessionMutationSupport.getSessionKbId(sessionId, currentUser);
  }
}
