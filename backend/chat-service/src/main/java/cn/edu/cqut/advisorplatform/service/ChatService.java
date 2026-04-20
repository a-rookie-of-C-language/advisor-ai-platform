package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.entity.UserDO;
<<<<<<< HEAD
import java.util.List;
import java.util.Map;
import org.springframework.lang.Nullable;

public interface ChatService {

  List<Map<String, Object>> listSessions(@Nullable UserDO currentUser);

  Map<String, Object> createSession(@Nullable UserDO currentUser);

  void deleteSession(Long sessionId, @Nullable UserDO currentUser);

  Map<String, Object> updateSessionKb(Long sessionId, Long kbId, @Nullable UserDO currentUser);

  List<Map<String, Object>> listMessages(Long sessionId, @Nullable UserDO currentUser);

  long getSessionKbId(Long sessionId, @Nullable UserDO currentUser);
=======
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Map;

public interface ChatService {

    List<Map<String, Object>> listSessions(@Nullable UserDO currentUser);

    Map<String, Object> createSession(@Nullable UserDO currentUser);

    void deleteSession(Long sessionId, @Nullable UserDO currentUser);

    Map<String, Object> updateSessionKb(Long sessionId, Long kbId, @Nullable UserDO currentUser);

    List<Map<String, Object>> listMessages(Long sessionId, @Nullable UserDO currentUser);

    long getSessionKbId(Long sessionId, @Nullable UserDO currentUser);
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
