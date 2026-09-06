package cn.edu.cqut.advisorplatform.service.impl.chat;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dao.chat.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.chat.ChatSessionDao;
import cn.edu.cqut.advisorplatform.service.chat.ChatService;
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
  @Transactional(readOnly = true)
  public List<Map<String, Object>> listMessages(
      Long sessionId, @Nullable UserPrincipal currentUser) {
    sessionMutationSupport.getOwnedSession(sessionId, currentUser);
    return chatMessageDao.findBySessionIdOrderByCreatedAtAscIdAsc(sessionId).stream()
        .map(chatSessionSupport::toMessageMap)
        .toList();
  }
}
