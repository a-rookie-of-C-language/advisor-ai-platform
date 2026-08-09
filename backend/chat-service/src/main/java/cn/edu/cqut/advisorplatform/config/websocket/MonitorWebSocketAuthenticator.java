package cn.edu.cqut.advisorplatform.config.websocket;

import cn.edu.cqut.advisorplatform.common.security.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

@Slf4j
@RequiredArgsConstructor
class MonitorWebSocketAuthenticator {

  private final JwtUtil jwtUtil;

  boolean authenticate(WebSocketSession session) {
    URI uri = session.getUri();
    if (uri == null) {
      closeSilently(session, CloseStatus.NOT_ACCEPTABLE);
      return false;
    }
    String token = extractQueryParam(uri.getQuery(), "token");
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

  private static String extractQueryParam(String query, String name) {
    if (query == null) {
      return null;
    }
    for (String param : query.split("&")) {
      String[] kv = param.split("=", 2);
      if (kv.length == 2 && name.equals(kv[0])) {
        return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
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
}
