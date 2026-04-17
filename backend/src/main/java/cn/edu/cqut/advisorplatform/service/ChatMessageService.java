package cn.edu.cqut.advisorplatform.service;

import org.springframework.lang.Nullable;

public interface ChatMessageService {

    void saveTurn(Long sessionId, Long userId, @Nullable String turnId, @Nullable String userContent, @Nullable String assistantContent);

    @Nullable
    String findAssistantContent(Long sessionId, Long userId, @Nullable String turnId);
}
