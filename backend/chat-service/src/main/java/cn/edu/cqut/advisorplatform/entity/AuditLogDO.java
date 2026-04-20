package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.*;
<<<<<<< HEAD
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(
    name = "audit_log",
    indexes = {
      @Index(name = "idx_audit_user_id", columnList = "user_id"),
      @Index(name = "idx_audit_module_action", columnList = "module, action"),
      @Index(name = "idx_audit_created_at", columnList = "created_at")
    })
public class AuditLogDO {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = true)
  private Long userId;

  @Column(length = 64)
  private String username;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AuditModule module;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AuditAction action;

  @Column(nullable = false, length = 128)
  private String method;

  @Column(length = 512)
  private String requestUri;

  @Column(columnDefinition = "TEXT")
  private String requestParams;

  @Column(length = 16)
  private String responseStatus;

  @Column(columnDefinition = "TEXT")
  private String responseData;

  @Column(length = 64)
  private String ipAddress;

  @Column(length = 256)
  private String userAgent;

  private Long durationMs;

  @Column(columnDefinition = "TEXT")
  private String errorMessage;

  @Column(length = 64)
  private String traceId;

  private Long sessionId;

  @Column(length = 128)
  private String turnId;

  @Column(length = 256)
  private String description;

  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
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
=======
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_audit_user_id", columnList = "user_id"),
        @Index(name = "idx_audit_module_action", columnList = "module, action"),
        @Index(name = "idx_audit_created_at", columnList = "created_at")
})
public class AuditLogDO {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private Long userId;

    @Column(length = 64)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AuditModule module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AuditAction action;

    @Column(nullable = false, length = 128)
    private String method;

    @Column(length = 512)
    private String requestUri;

    @Column(columnDefinition = "TEXT")
    private String requestParams;

    @Column(length = 16)
    private String responseStatus;

    @Column(columnDefinition = "TEXT")
    private String responseData;

    @Column(length = 64)
    private String ipAddress;

    @Column(length = 256)
    private String userAgent;

    private Long durationMs;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(length = 64)
    private String traceId;

    private Long sessionId;

    @Column(length = 128)
    private String turnId;

    @Column(length = 256)
    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum AuditModule {
        AUTH, RAG, MEMORY, CHAT
    }

    public enum AuditAction {
        LOGIN, LOGOUT,
        SEARCH, QUERY, UPLOAD_DOCUMENT, DELETE_DOCUMENT,
        STORE, RETRIEVE, UPDATE, DELETE,
        CHAT, STREAM_CHAT
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
