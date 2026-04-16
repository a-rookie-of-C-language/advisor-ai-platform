package cn.edu.cqut.advisorplatform.service;

public interface ChatMessageService {

    void saveTurn(Long sessionId, Long userId, String turnId, String userContent, String assistantContent);

    String findAssistantContent(Long sessionId, Long userId, String turnId);
}
