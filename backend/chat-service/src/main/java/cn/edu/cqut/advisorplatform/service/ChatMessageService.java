package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
<<<<<<< HEAD
import java.util.List;
import org.springframework.lang.Nullable;

public interface ChatMessageService {

  void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent,
      @Nullable List<ChatMessageDO.SourceReference> sources);

  default void saveTurn(
      Long sessionId,
      Long userId,
      @Nullable String turnId,
      @Nullable String userContent,
      @Nullable String assistantContent) {
    saveTurn(sessionId, userId, turnId, userContent, assistantContent, null);
  }

  @Nullable
  String findAssistantContent(Long sessionId, Long userId, @Nullable String turnId);
=======
import org.springframework.lang.Nullable;

import java.util.List;

public interface ChatMessageService {

    void saveTurn(Long sessionId, Long userId, @Nullable String turnId, @Nullable String userContent, @Nullable String assistantContent, @Nullable List<ChatMessageDO.SourceReference> sources);

    default void saveTurn(Long sessionId, Long userId, @Nullable String turnId, @Nullable String userContent, @Nullable String assistantContent) {
        saveTurn(sessionId, userId, turnId, userContent, assistantContent, null);
    }

    @Nullable
    String findAssistantContent(Long sessionId, Long userId, @Nullable String turnId);
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
