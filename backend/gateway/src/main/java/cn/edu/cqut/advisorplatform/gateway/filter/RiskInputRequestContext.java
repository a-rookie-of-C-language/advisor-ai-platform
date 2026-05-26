package cn.edu.cqut.advisorplatform.gateway.filter;

import org.springframework.web.server.ServerWebExchange;

public class RiskInputRequestContext {

  private final String path;
  private final String userId;
  private final String sessionId;
  private final String ipAddress;

  private RiskInputRequestContext(String path, String userId, String sessionId, String ipAddress) {
    this.path = path;
    this.userId = userId;
    this.sessionId = sessionId;
    this.ipAddress = ipAddress;
  }

  public static RiskInputRequestContext from(ServerWebExchange exchange) {
    String path = exchange.getRequest().getURI().getPath();
    String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
    String sessionId = exchange.getRequest().getHeaders().getFirst("X-Session-Id");
    String ipAddress =
        exchange.getRequest().getRemoteAddress() != null
            ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
            : "unknown";
    return new RiskInputRequestContext(path, userId, sessionId, ipAddress);
  }

  public String getPath() {
    return path;
  }

  public String getUserId() {
    return userId;
  }

  public String getSessionId() {
    return sessionId;
  }

  public String getIpAddress() {
    return ipAddress;
  }
}
