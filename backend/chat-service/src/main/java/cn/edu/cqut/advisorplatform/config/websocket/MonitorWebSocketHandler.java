package cn.edu.cqut.advisorplatform.config.websocket;

import cn.edu.cqut.advisorplatform.common.security.JwtUtil;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
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
  private final ObjectMapper objectMapper;
  private final MonitorWebSocketAuthenticator authenticator;

  private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
  private final Object broadcastTaskLock = new Object();
  private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
  private ScheduledFuture<?> broadcastTask;

  public MonitorWebSocketHandler(
      MonitorService monitorService, JwtUtil jwtUtil, ObjectMapper objectMapper) {
    this.monitorService = monitorService;
    this.objectMapper = objectMapper;
    this.authenticator = new MonitorWebSocketAuthenticator(jwtUtil);
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
    if (sessions.isEmpty()) {
      stopBroadcast();
    }
  }

  private boolean authenticate(WebSocketSession session) {
    return authenticator.authenticate(session);
  }

  private void ensureBroadcastRunning() {
    synchronized (broadcastTaskLock) {
      if (broadcastTask == null || broadcastTask.isCancelled()) {
        broadcastTask =
            scheduler.scheduleWithFixedDelay(
                this::broadcast, 0, BROADCAST_INTERVAL_SEC, TimeUnit.SECONDS);
      }
    }
  }

  private void stopBroadcast() {
    synchronized (broadcastTaskLock) {
      if (broadcastTask != null && !broadcastTask.isCancelled()) {
        broadcastTask.cancel(false);
      }
      broadcastTask = null;
    }
  }

  @PreDestroy
  public void shutdown() {
    stopBroadcast();
    scheduler.shutdownNow();
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

  @Override
  public boolean supportsPartialMessages() {
    return false;
  }
}
