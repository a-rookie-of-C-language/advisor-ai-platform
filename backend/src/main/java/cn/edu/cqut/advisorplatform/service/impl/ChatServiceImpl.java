package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.ChatService;
import org.springframework.lang.Nullable;
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

    private static final String DEFAULT_SESSION_TITLE = "\u65b0\u5bf9\u8bdd";
    private static final long DEFAULT_KB_ID = 0L;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ChatSessionDao chatSessionDao;
    private final ChatMessageDao chatMessageDao;
    private final RagKnowledgeBaseDao ragKnowledgeBaseDao;

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
    public Map<String, Object> updateSessionKb(Long sessionId, Long kbId, @Nullable UserDO currentUser) {
        ChatSessionDO session = getOwnedSession(sessionId, currentUser);
        if (kbId == null || kbId <= 0) {
            session.setKbId(DEFAULT_KB_ID);
        } else {
            ragKnowledgeBaseDao.findById(kbId)
                    .orElseThrow(() -> new NotFoundException("知识库不存在"));
            session.setKbId(kbId);
        }
        session.setUpdatedAt(LocalDateTime.now());
        return toSessionMap(chatSessionDao.save(session));
    }

    @Override
    public List<Map<String, Object>> listMessages(Long sessionId, @Nullable UserDO currentUser) {
        getOwnedSession(sessionId, currentUser);
        return chatMessageDao.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
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
        ChatSessionDO session = chatSessionDao.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("\u4f1a\u8bdd\u4e0d\u5b58\u5728"));
        Long currentUserId = requireUserId(currentUser);
        Long ownerId = session.getUser() == null ? null : session.getUser().getId();
        if (ownerId == null || !ownerId.equals(currentUserId)) {
            throw new ForbiddenException("\u65e0\u6743\u8bbf\u95ee\u8be5\u4f1a\u8bdd");
        }
        return session;
    }

    private Map<String, Object> toSessionMap(ChatSessionDO session) {
        LocalDateTime time = session.getUpdatedAt() == null ? session.getCreatedAt() : session.getUpdatedAt();
        String title = session.getTitle() == null || session.getTitle().isBlank()
                ? DEFAULT_SESSION_TITLE
                : session.getTitle();
        long kbId = session.getKbId() == null ? DEFAULT_KB_ID : session.getKbId();
        return Map.of(
                "id", session.getId(),
                "title", title,
                "kbId", kbId,
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
            throw new ForbiddenException("\u672a\u767b\u5f55\u6216\u767b\u5f55\u5df2\u5931\u6548");
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
}
