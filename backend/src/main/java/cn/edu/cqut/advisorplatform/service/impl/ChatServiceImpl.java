package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private static final String DEFAULT_SESSION_TITLE = "新对话";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ChatSessionDao chatSessionDao;
    private final ChatMessageDao chatMessageDao;

    @Override
    public List<Map<String, Object>> listSessions(UserDO currentUser) {
        Long userId = requireUserId(currentUser);
        return chatSessionDao.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toSessionMap)
                .toList();
    }

    @Override
    @Transactional
    public Map<String, Object> createSession(UserDO currentUser) {
        ChatSessionDO session = new ChatSessionDO();
        session.setUser(requireUser(currentUser));
        session.setTitle(DEFAULT_SESSION_TITLE);
        LocalDateTime now = LocalDateTime.now();
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        ChatSessionDO saved = chatSessionDao.save(session);
        return toSessionMap(saved);
    }

    @Override
    @Transactional
    public void deleteSession(Long sessionId, UserDO currentUser) {
        ChatSessionDO session = getOwnedSession(sessionId, currentUser);
        chatSessionDao.deleteById(session.getId());
    }

    @Override
    public List<Map<String, Object>> listMessages(Long sessionId, UserDO currentUser) {
        getOwnedSession(sessionId, currentUser);
        return chatMessageDao.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(this::toMessageMap)
                .toList();
    }

    private ChatSessionDO getOwnedSession(Long sessionId, UserDO currentUser) {
        ChatSessionDO session = chatSessionDao.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("会话不存在"));
        Long currentUserId = requireUserId(currentUser);
        Long ownerId = session.getUser() == null ? null : session.getUser().getId();
        if (ownerId == null || !ownerId.equals(currentUserId)) {
            throw new ForbiddenException("无权访问该会话");
        }
        return session;
    }

    private Map<String, Object> toSessionMap(ChatSessionDO session) {
        LocalDateTime time = session.getUpdatedAt() == null ? session.getCreatedAt() : session.getUpdatedAt();
        String title = session.getTitle() == null || session.getTitle().isBlank()
                ? DEFAULT_SESSION_TITLE
                : session.getTitle();
        return Map.of(
                "id", session.getId(),
                "title", title,
                "updatedAt", formatTime(time)
        );
    }

    private Map<String, Object> toMessageMap(ChatMessageDO message) {
        return Map.of(
                "id", message.getId(),
                "role", message.getRole(),
                "content", message.getContent()
        );
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

    private Long requireUserId(UserDO currentUser) {
        return requireUser(currentUser).getId();
    }
}
