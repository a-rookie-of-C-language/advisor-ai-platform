package cn.edu.cqut.advisorplatform.config.websocket;

import cn.edu.cqut.advisorplatform.config.security.JwtUtil;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Slf4j
public class MonitorWebSocketHandler extends TextWebSocketHandler {

  private static final int BROADCAST_INTERVAL_SEC = 10;
  private static final int MINUTES = 15;
  private static final int STEP_SECONDS = 10;

  private final MonitorService monitorService;
  private final JwtUtil jwtUtil;
  private final ObjectMapper objectMapper;

  private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
  private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
  private ScheduledFuture<?> broadcastTask;

  public MonitorWebSocketHandler(
      MonitorService monitorService, JwtUtil jwtUtil, ObjectMapper objectMapper) {
    this.monitorService = monitorService;
    this.jwtUtil = jwtUtil;
    this.objectMapper = objectMapper;
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    if (!authenticate(session)) {
      return;
    }
    sessions.put(session.getId(), session);
    log.info("monitor ws connected: sessionId={}", session.getId());
    ensureBroadcastRunning();
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessions.remove(session.getId());
    log.info("monitor ws disconnected: sessionId={}", session.getId());
    if (sessions.isEmpty()) {
      stopBroadcast();
    }
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) {
    log.warn("monitor ws transport error: sessionId={}", session.getId(), exception);
    sessions.remove(session.getId());
  }

  private boolean authenticate(WebSocketSession session) {
    URI uri = session.getUri();
    if (uri == null) {
      closeSilently(session, CloseStatus.NOT_ACCEPTABLE);
      return false;
    }
    String query = uri.getQuery();
    String token = extractQueryParam(query, "token");
    if (token == null || token.isBlank()) {
      closeSilently(session, CloseStatus.NOT_ACCEPTABLE);
      return false;
    }
    try {
      Claims claims = jwtUtil.extractClaims(token);
      if (!jwtUtil.isAccessToken(claims) || jwtUtil.isTokenExpired(claims)) {
        closeSilently(session, CloseStatus.NOT_ACCEPTABLE);
        return false;
      }
      return true;
    } catch (JwtException | IllegalArgumentException e) {
      log.warn("monitor ws auth failed: {}", e.getMessage());
      closeSilently(session, CloseStatus.NOT_ACCEPTABLE);
      return false;
    }
  }

  private void ensureBroadcastRunning() {
    if (broadcastTask == null || broadcastTask.isCancelled()) {
      broadcastTask =
          scheduler.scheduleWithFixedDelay(
              this::broadcast, 0, BROADCAST_INTERVAL_SEC, TimeUnit.SECONDS);
    }
  }

  private void stopBroadcast() {
    if (broadcastTask != null && !broadcastTask.isCancelled()) {
      broadcastTask.cancel(false);
      broadcastTask = null;
    }
  }

  private void broadcast() {
    if (sessions.isEmpty()) {
      return;
    }
    try {
      var data = monitorService.getRealtimeMetrics(MINUTES, STEP_SECONDS);
      String json = objectMapper.writeValueAsString(data);
      TextMessage message = new TextMessage(json);
      for (WebSocketSession session : sessions.values()) {
        if (session.isOpen()) {
          try {
            session.sendMessage(message);
          } catch (IOException e) {
            log.warn("monitor ws send failed: sessionId={}", session.getId(), e);
            sessions.remove(session.getId());
          }
        }
      }
    } catch (Exception e) {
      log.error("monitor ws broadcast error", e);
    }
  }

  private static String extractQueryParam(String query, String name) {
    if (query == null) {
      return null;
    }
    for (String param : query.split("&")) {
      String[] kv = param.split("=", 2);
      if (kv.length == 2 && name.equals(kv[0])) {
        return kv[1];
      }
    }
    return null;
  }

  private static void closeSilently(WebSocketSession session, CloseStatus status) {
    try {
      session.close(status);
    } catch (IOException ignored) {
      // best effort
    }
  }

  @Override
  public boolean supportsPartialMessages() {
    return false;
  }
}
