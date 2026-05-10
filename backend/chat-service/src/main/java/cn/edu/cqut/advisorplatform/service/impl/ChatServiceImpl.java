package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.client.RagServiceClient;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.ChatService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

  private static final String DEFAULT_SESSION_TITLE = "新对话";
  private static final long DEFAULT_KB_ID = 0L;
  private static final DateTimeFormatter TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final ChatSessionDao chatSessionDao;
  private final ChatMessageDao chatMessageDao;
  private final RagServiceClient ragServiceClient;

  @Override
  public List<Map<String, Object>> listSessions(@Nullable UserDO currentUser) {
    Long userId = requireUserId(currentUser);
    return chatSessionDao.findByUserIdOrderByUpdatedAtDesc(userId).stream()
        .map(this::toSessionMap)
        .toList();
  }

  @Override
  @Transactional
  public Map<String, Object> createSession(@Nullable UserDO currentUser) {
    ChatSessionDO session = new ChatSessionDO();
    session.setUser(requireUser(currentUser));
    session.setTitle(DEFAULT_SESSION_TITLE);
    session.setKbId(DEFAULT_KB_ID);
    LocalDateTime now = LocalDateTime.now();
    session.setCreatedAt(now);
    session.setUpdatedAt(now);
    ChatSessionDO saved = chatSessionDao.save(session);
    return toSessionMap(saved);
  }

  @Override
  @Transactional
  public void deleteSession(Long sessionId, @Nullable UserDO currentUser) {
    ChatSessionDO session = getOwnedSession(sessionId, currentUser);
    chatSessionDao.deleteById(session.getId());
  }

  @Override
  @Transactional
  public Map<String, Object> updateSessionKb(
      Long sessionId, Long kbId, @Nullable UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    if (kbId == null || kbId <= 0) {
      session.setKbId(DEFAULT_KB_ID);
    } else {
      if (!existsKnowledgeBase(kbId)) {
        throw new NotFoundException("知识库不存在");
      }
      session.setKbId(kbId);
    }
    session.setUpdatedAt(LocalDateTime.now());
    return toSessionMap(chatSessionDao.save(session));
  }

  @Override
  public List<Map<String, Object>> listMessages(Long sessionId, @Nullable UserDO currentUser) {
    getOwnedSession(sessionId, currentUser);
    return chatMessageDao.findBySessionIdOrderByCreatedAtAscIdAsc(sessionId).stream()
        .map(this::toMessageMap)
        .toList();
  }

  @Override
  public long getSessionKbId(Long sessionId, @Nullable UserDO currentUser) {
    ChatSessionDO session = getOwnedSession(sessionId, currentUser);
    Long kbId = session.getKbId();
    return kbId == null ? DEFAULT_KB_ID : kbId;
  }

  private ChatSessionDO getOwnedSession(Long sessionId, UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    Long currentUserId = requireUserId(currentUser);
    Long ownerId = session.getUser() == null ? null : session.getUser().getId();
    if (ownerId == null || !ownerId.equals(currentUserId)) {
      throw new ForbiddenException("无权访问该会话");
    }
    return session;
  }

  private Map<String, Object> toSessionMap(ChatSessionDO session) {
    LocalDateTime time =
        session.getUpdatedAt() == null ? session.getCreatedAt() : session.getUpdatedAt();
    String title =
        session.getTitle() == null || session.getTitle().isBlank()
            ? DEFAULT_SESSION_TITLE
            : session.getTitle();
    long kbId = session.getKbId() == null ? DEFAULT_KB_ID : session.getKbId();
    return Map.of(
        "id", session.getId(), "title", title, "kbId", kbId, "updatedAt", formatTime(time));
  }

  private Map<String, Object> toMessageMap(ChatMessageDO message) {
    return Map.of(
        "id", message.getId(),
        "role", message.getRole(),
        "content", message.getContent(),
        "sources", message.getSources() == null ? List.of() : message.getSources());
  }

  private String formatTime(LocalDateTime value) {
    if (value == null) {
      return "";
    }
    return TIME_FORMATTER.format(value);
  }

  private UserDO requireUser(UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    return currentUser;
  }

  private Long requireUserId(@Nullable UserDO currentUser) {
    UserDO safeUser = requireUser(currentUser);
    Long userId = safeUser.getId();
    if (userId == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    return userId;
  }

  private boolean existsKnowledgeBase(Long kbId) {
    try {
      ApiResponseDTO<Map<String, Boolean>> response = ragServiceClient.existsKnowledgeBase(kbId);
      if (response == null || response.getData() == null) {
        return false;
      }
      return Boolean.TRUE.equals(response.getData().get("exists"));
    } catch (Exception ignored) {
      return false;
    }
  }
}
