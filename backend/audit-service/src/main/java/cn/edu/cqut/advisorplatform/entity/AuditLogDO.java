package cn.edu.cqut.advisorplatform.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AuditLogDO {

  private Long id;

  private Long userId;

  private String username;

  private AuditModule module;

  private AuditAction action;

  private String method;

  private String requestUri;

  private String requestParams;

  private String responseStatus;

  private String responseData;

  private String ipAddress;

  private String userAgent;

  private Long durationMs;

  private String errorMessage;

  private String traceId;

  private Long sessionId;

  private String turnId;

  private String description;

  private LocalDateTime createdAt;

  protected void onCreate() {
    createdAt = LocalDateTime.now();
  }

  public enum AuditModule {
    AUTH,
    RAG,
    MEMORY,
    CHAT
  }

  public enum AuditAction {
    LOGIN,
    LOGOUT,
    SEARCH,
    QUERY,
    UPLOAD_DOCUMENT,
    DELETE_DOCUMENT,
    STORE,
    RETRIEVE,
    UPDATE,
    DELETE,
    CHAT,
    STREAM_CHAT
  }
}
