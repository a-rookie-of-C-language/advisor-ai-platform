package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.UserDO;

import java.util.List;
import java.util.Map;

public interface ChatService {

    List<Map<String, Object>> listSessions(UserDO currentUser);

    Map<String, Object> createSession(UserDO currentUser);

    void deleteSession(Long sessionId, UserDO currentUser);

    List<Map<String, Object>> listMessages(Long sessionId, UserDO currentUser);
}
