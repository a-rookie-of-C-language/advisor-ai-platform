package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.client.RagServiceClient;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.UserRole;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatSessionSupport {

  private static final String DEFAULT_SESSION_TITLE = "???";
  private static final long DEFAULT_KB_ID = 0L;
  private static final DateTimeFormatter TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private final RagServiceClient ragServiceClient;

  public Map<String, Object> toSessionMap(ChatSessionDO session) {
    LocalDateTime time =
        session.getUpdatedAt() == null ? session.getCreatedAt() : session.getUpdatedAt();
    String title =
        session.getTitle() == null || session.getTitle().isBlank()
            ? DEFAULT_SESSION_TITLE
            : session.getTitle();
    long kbId = session.getKbId() == null ? DEFAULT_KB_ID : session.getKbId();
    return Map.of(
        "id", session.getId(), "title", title, "kbId", kbId, "updatedAt", formatTime(time));
  }

  public Map<String, Object> toMessageMap(ChatMessageDO message) {
    return Map.of(
        "id", message.getId(),
        "role", message.getRole(),
        "content", message.getContent(),
        "sources", message.getSources() == null ? List.of() : message.getSources(),
        "events", message.getEvents() == null ? List.of() : message.getEvents());
  }

  public UserDO toUserReference(UserPrincipal currentUser) {
    UserDO user = new UserDO();
    user.setId(currentUser.getId());
    user.setUsername(currentUser.getUsername());
    user.setRealName(currentUser.getRealName());
    user.setRole(UserRole.valueOf(currentUser.getRole().name()));
    user.setEnabled(currentUser.isEnabled());
    return user;
  }

  public UserPrincipal requireUser(UserPrincipal currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    return currentUser;
  }

  public Long requireUserId(UserPrincipal currentUser) {
    UserPrincipal safeUser = requireUser(currentUser);
    Long userId = safeUser.getId();
    if (userId == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    return userId;
  }

  public boolean existsKnowledgeBase(Long kbId) {
    try {
      ApiResponseDTO<Map<String, Boolean>> response = ragServiceClient.existsKnowledgeBase(kbId);
      if (response == null || response.getData() == null) {
        return false;
      }
      return Boolean.TRUE.equals(response.getData().get("exists"));
    } catch (Exception ignored) {
      return false;
    }
  }

  private String formatTime(LocalDateTime value) {
    if (value == null) {
      return "";
    }
    return TIME_FORMATTER.format(value);
  }
}
