package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ChatMessageDao;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private final ChatMessageDao chatMessageDao;
    private final ChatSessionDao chatSessionDao;

    @Override
    @Transactional
    public void saveTurn(Long sessionId, Long userId, String userContent, String assistantContent) {
        ChatSessionDO session = chatSessionDao.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("会话不存在"));

        Long ownerId = session.getUser() == null ? null : session.getUser().getId();
        if (ownerId == null || !ownerId.equals(userId)) {
            throw new ForbiddenException("无权访问该会话");
        }

        LocalDateTime now = LocalDateTime.now();
        String safeUserContent = userContent == null ? "" : userContent.trim();
        String safeAssistantContent = assistantContent == null ? "" : assistantContent.trim();

        if (!safeUserContent.isBlank()) {
            ChatMessageDO userMessage = new ChatMessageDO();
            userMessage.setSession(session);
            userMessage.setRole("user");
            userMessage.setContent(safeUserContent);
            userMessage.setCreatedAt(now);
            chatMessageDao.save(userMessage);
        }

        if (safeAssistantContent.isBlank()) {
            safeAssistantContent = "请求失败，请稍后重试。";
        }

        ChatMessageDO assistantMessage = new ChatMessageDO();
        assistantMessage.setSession(session);
        assistantMessage.setRole("assistant");
        assistantMessage.setContent(safeAssistantContent);
        assistantMessage.setCreatedAt(now);
        chatMessageDao.save(assistantMessage);

        session.setUpdatedAt(now);
        chatSessionDao.save(session);
    }
}
