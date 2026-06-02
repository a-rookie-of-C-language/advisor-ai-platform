package cn.edu.cqut.advisorplatform.config.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.common.security.JwtUtil;
import cn.edu.cqut.advisorplatform.service.MonitorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import java.net.URI;
import java.util.concurrent.ScheduledFuture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

class MonitorWebSocketHandlerTest {

  private MonitorWebSocketHandler handler;

  @AfterEach
  void tearDown() {
    if (handler != null) {
      handler.shutdown();
    }
  }

  @Test
  void shouldStartOnlyOneBroadcastTaskForMultipleConnections() {
    handler = newHandler();
    WebSocketSession firstSession = authenticatedSession("s1");
    WebSocketSession secondSession = authenticatedSession("s2");

    handler.afterConnectionEstablished(firstSession);
    ScheduledFuture<?> firstTask = broadcastTask();
    handler.afterConnectionEstablished(secondSession);
    ScheduledFuture<?> secondTask = broadcastTask();

    assertThat((Object) firstTask).isNotNull();
    assertThat((Object) secondTask).isSameAs(firstTask);
    assertThat(secondTask.isCancelled()).isFalse();
  }

  @Test
  void shouldStopBroadcastTaskWhenLastSessionClosed() {
    handler = newHandler();
    WebSocketSession session = authenticatedSession("s1");

    handler.afterConnectionEstablished(session);
    assertThat((Object) broadcastTask()).isNotNull();

    handler.afterConnectionClosed(session, CloseStatus.NORMAL);

    assertThat((Object) broadcastTask()).isNull();
  }

  @Test
  void shouldStopBroadcastTaskWhenTransportErrorRemovesLastSession() {
    handler = newHandler();
    WebSocketSession session = authenticatedSession("s1");

    handler.afterConnectionEstablished(session);
    assertThat((Object) broadcastTask()).isNotNull();

    handler.handleTransportError(session, new RuntimeException("broken"));

    assertThat((Object) broadcastTask()).isNull();
  }

  private MonitorWebSocketHandler newHandler() {
    JwtUtil jwtUtil = mock(JwtUtil.class);
    Claims claims = mock(Claims.class);
    when(jwtUtil.extractClaims("token")).thenReturn(claims);
    when(jwtUtil.isAccessToken(claims)).thenReturn(true);
    when(jwtUtil.isTokenExpired(claims)).thenReturn(false);
    return new MonitorWebSocketHandler(mock(MonitorService.class), jwtUtil, new ObjectMapper());
  }

  private WebSocketSession authenticatedSession(String id) {
    WebSocketSession session = mock(WebSocketSession.class);
    when(session.getId()).thenReturn(id);
    when(session.getUri()).thenReturn(URI.create("ws://localhost/ws/monitor?token=token"));
    when(session.isOpen()).thenReturn(false);
    return session;
  }

  private ScheduledFuture<?> broadcastTask() {
    return (ScheduledFuture<?>) ReflectionTestUtils.getField(handler, "broadcastTask");
  }
}
