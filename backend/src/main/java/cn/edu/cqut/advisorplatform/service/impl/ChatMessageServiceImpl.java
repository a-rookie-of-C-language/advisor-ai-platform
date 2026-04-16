package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private static final String ROLE_USER = "user";
    private static final String ROLE_ASSISTANT = "assistant";
    private static final String ASSISTANT_ERROR_PLACEHOLDER = "请求失败，请稍后重试。";

    private final ChatMessageDao chatMessageDao;
    private final ChatSessionDao chatSessionDao;

    @Override
    @Transactional
    public void saveTurn(Long sessionId, Long userId, String turnId, String userContent, String assistantContent) {
        ChatSessionDO session = chatSessionDao.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("会话不存在"));

        Long ownerId = session.getUser() == null ? null : session.getUser().getId();
        if (ownerId == null || !ownerId.equals(userId)) {
            throw new ForbiddenException("无权访问该会话");
        }

        String safeTurnId = turnId == null ? "" : turnId.trim();
        if (safeTurnId.isBlank()) {
            return;
        }

        if (chatMessageDao.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_ASSISTANT)) {
            return;
        }

        String safeUserContent = userContent == null ? "" : userContent.trim();
        String safeAssistantContent = assistantContent == null ? "" : assistantContent.trim();
        if (safeAssistantContent.isBlank()) {
            safeAssistantContent = ASSISTANT_ERROR_PLACEHOLDER;
        }

        LocalDateTime now = LocalDateTime.now();

        if (!safeUserContent.isBlank()
                && !chatMessageDao.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_USER)) {
            insertMessage(session, safeTurnId, ROLE_USER, safeUserContent, now);
        }

        if (!chatMessageDao.existsBySessionIdAndTurnIdAndRole(sessionId, safeTurnId, ROLE_ASSISTANT)) {
            insertMessage(session, safeTurnId, ROLE_ASSISTANT, safeAssistantContent, now);
        }

        session.setUpdatedAt(now);
        chatSessionDao.save(session);
    }

    private void insertMessage(ChatSessionDO session, String turnId, String role, String content, LocalDateTime now) {
        ChatMessageDO message = new ChatMessageDO();
        message.setSession(session);
        message.setTurnId(turnId);
        message.setRole(role);
        message.setContent(content);
        message.setCreatedAt(now);
        try {
            chatMessageDao.save(message);
        } catch (DataIntegrityViolationException ignored) {
            // 并发重试导致唯一键冲突时视为幂等成功
        }
    }
}
