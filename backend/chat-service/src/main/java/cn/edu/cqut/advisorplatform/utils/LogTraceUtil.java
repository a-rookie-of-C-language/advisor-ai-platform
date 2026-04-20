package cn.edu.cqut.advisorplatform.utils;

<<<<<<< HEAD
import java.util.UUID;
import org.slf4j.MDC;

public final class LogTraceUtil {

  public static final String TRACE_ID = "traceId";
  public static final String SESSION_ID = "sessionId";
  public static final String TURN_ID = "turnId";
  public static final String USER_ID = "userId";

  private static final int DEFAULT_PREVIEW = 80;

  private LogTraceUtil() {}

  public static String resolveTraceId(String headerTraceId) {
    if (headerTraceId != null) {
      String normalized = headerTraceId.trim();
      if (!normalized.isEmpty()) {
        return normalized;
      }
    }
    return UUID.randomUUID().toString().replace("-", "");
  }

  public static void put(String traceId, Long sessionId, String turnId, Long userId) {
    putIfNotBlank(TRACE_ID, traceId);
    putIfNotBlank(SESSION_ID, sessionId == null ? null : String.valueOf(sessionId));
    putIfNotBlank(TURN_ID, turnId);
    putIfNotBlank(USER_ID, userId == null ? null : String.valueOf(userId));
  }

  public static String get(String key) {
    String value = MDC.get(key);
    return value == null ? "" : value;
  }

  public static void clear() {
    MDC.remove(TRACE_ID);
    MDC.remove(SESSION_ID);
    MDC.remove(TURN_ID);
    MDC.remove(USER_ID);
  }

  public static String preview(String text) {
    return preview(text, DEFAULT_PREVIEW);
  }

  public static String preview(String text, int limit) {
    if (text == null) {
      return "";
    }
    String normalized = text.replace("\r", " ").replace("\n", " ").trim();
    if (normalized.length() <= limit) {
      return normalized;
    }
    return normalized.substring(0, limit);
  }

  private static void putIfNotBlank(String key, String value) {
    if (value == null || value.isBlank()) {
      return;
    }
    MDC.put(key, value);
  }
=======
import org.slf4j.MDC;

import java.util.UUID;

public final class LogTraceUtil {

    public static final String TRACE_ID = "traceId";
    public static final String SESSION_ID = "sessionId";
    public static final String TURN_ID = "turnId";
    public static final String USER_ID = "userId";

    private static final int DEFAULT_PREVIEW = 80;

    private LogTraceUtil() {
    }

    public static String resolveTraceId(String headerTraceId) {
        if (headerTraceId != null) {
            String normalized = headerTraceId.trim();
            if (!normalized.isEmpty()) {
                return normalized;
            }
        }
        return UUID.randomUUID().toString().replace("-", "");
    }

    public static void put(String traceId, Long sessionId, String turnId, Long userId) {
        putIfNotBlank(TRACE_ID, traceId);
        putIfNotBlank(SESSION_ID, sessionId == null ? null : String.valueOf(sessionId));
        putIfNotBlank(TURN_ID, turnId);
        putIfNotBlank(USER_ID, userId == null ? null : String.valueOf(userId));
    }

    public static String get(String key) {
        String value = MDC.get(key);
        return value == null ? "" : value;
    }

    public static void clear() {
        MDC.remove(TRACE_ID);
        MDC.remove(SESSION_ID);
        MDC.remove(TURN_ID);
        MDC.remove(USER_ID);
    }

    public static String preview(String text) {
        return preview(text, DEFAULT_PREVIEW);
    }

    public static String preview(String text, int limit) {
        if (text == null) {
            return "";
        }
        String normalized = text.replace("\r", " ").replace("\n", " ").trim();
        if (normalized.length() <= limit) {
            return normalized;
        }
        return normalized.substring(0, limit);
    }

    private static void putIfNotBlank(String key, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        MDC.put(key, value);
    }
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
}
