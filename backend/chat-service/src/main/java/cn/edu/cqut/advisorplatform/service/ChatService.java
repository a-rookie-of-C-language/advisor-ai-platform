package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.util.List;
import java.util.Map;
import org.springframework.lang.Nullable;

public interface ChatService {

  List<Map<String, Object>> listSessions(@Nullable UserPrincipal currentUser);

  Map<String, Object> createSession(@Nullable UserPrincipal currentUser);

  void deleteSession(Long sessionId, @Nullable UserPrincipal currentUser);

  Map<String, Object> updateSessionKb(
      Long sessionId, Long kbId, @Nullable UserPrincipal currentUser);

  List<Map<String, Object>> listMessages(Long sessionId, @Nullable UserPrincipal currentUser);

  long getSessionKbId(Long sessionId, @Nullable UserPrincipal currentUser);
}
