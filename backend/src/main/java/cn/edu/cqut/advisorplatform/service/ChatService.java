package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Map;

public interface ChatService {

    List<Map<String, Object>> listSessions(@Nullable UserDO currentUser);

    Map<String, Object> createSession(@Nullable UserDO currentUser);

    void deleteSession(Long sessionId, @Nullable UserDO currentUser);

    List<Map<String, Object>> listMessages(Long sessionId, @Nullable UserDO currentUser);

    long getSessionKbId(Long sessionId, @Nullable UserDO currentUser);
}
