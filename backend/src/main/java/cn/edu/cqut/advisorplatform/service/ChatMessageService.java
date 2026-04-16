package cn.edu.cqut.advisorplatform.service;

public interface ChatMessageService {

    void saveTurn(Long sessionId, Long userId, String userContent, String assistantContent);
}
