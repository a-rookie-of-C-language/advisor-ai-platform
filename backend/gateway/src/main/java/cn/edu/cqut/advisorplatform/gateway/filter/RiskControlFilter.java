package cn.edu.cqut.advisorplatform.gateway.filter;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RiskControlFilter implements GlobalFilter, Ordered {

  private static final Logger log = LoggerFactory.getLogger(RiskControlFilter.class);
  private static final List<String> RISK_CHECK_PATHS =
      List.of("/api/chat/", "/api/session/", "/api/rag/", "/api/memory/");

  @Value("${advisor.risk.control-service-url:http://risk-control-service:8086}")
  private String riskControlServiceUrl;

  private final WebClient webClient;

  public RiskControlFilter(WebClient.Builder webClientBuilder) {
    this.webClient = webClientBuilder.build();
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();

    // 只对需要风控的路径进行检查
    boolean needCheck = RISK_CHECK_PATHS.stream().anyMatch(path::startsWith);
    if (!needCheck) {
      return chain.filter(exchange);
    }

    // 只检查POST请求
    if (exchange.getRequest().getMethod() != HttpMethod.POST) {
      return chain.filter(exchange);
    }

    String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
    String sessionId = exchange.getRequest().getHeaders().getFirst("X-Session-Id");
    String ipAddress =
        exchange.getRequest().getRemoteAddress() != null
            ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
            : "unknown";

    // 读取请求体
    return DataBufferUtils.join(exchange.getRequest().getBody())
        .flatMap(
            dataBuffer -> {
              byte[] bytes = new byte[dataBuffer.readableByteCount()];
              dataBuffer.read(bytes);
              DataBufferUtils.release(dataBuffer);
              String requestBody = new String(bytes, StandardCharsets.UTF_8);

              return callRiskControlService(userId, sessionId, ipAddress, path, requestBody)
                  .flatMap(
                      response -> {
                        if (response.isPassed()) {
                          return chain.filter(exchange);
                        }

                        log.warn(
                            "Risk control blocked: userId={}, path={}, category={}, reason={}",
                            userId,
                            path,
                            response.getCategory(),
                            response.getReason());

                        exchange
                            .getResponse()
                            .setStatusCode(HttpStatus.valueOf(response.getStatusCode()));
                        exchange
                            .getResponse()
                            .getHeaders()
                            .setContentType(MediaType.APPLICATION_JSON);

                        String errorBody =
                            String.format(
                                "{\"code\":%d,\"message\":\"%s\"}",
                                response.getStatusCode(), response.getMessage());

                        DataBuffer buffer =
                            exchange
                                .getResponse()
                                .bufferFactory()
                                .wrap(errorBody.getBytes(StandardCharsets.UTF_8));
                        return exchange.getResponse().writeWith(Mono.just(buffer));
                      });
            })
        .onErrorResume(
            e -> {
              log.error("Risk control service call failed, allowing request: path={}", path, e);
              return chain.filter(exchange);
            });
  }

  private Mono<RiskCheckResponse> callRiskControlService(
      String userId, String sessionId, String ipAddress, String path, String requestBody) {

    RiskCheckRequest request = new RiskCheckRequest();
    request.setUserId(userId != null ? Long.parseLong(userId) : null);
    request.setSessionId(sessionId);
    request.setIpAddress(ipAddress);
    request.setRequestPath(path);
    request.setRequestBody(requestBody);
    request.setContent(requestBody);

    return webClient
        .post()
        .uri(riskControlServiceUrl + "/internal/risk/check")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(RiskCheckResponse.class)
        .defaultIfEmpty(RiskCheckResponse.passed());
  }

  @Override
  public int getOrder() {
    return -50; // 在JWT过滤器之后执行
  }

  public static class RiskCheckRequest {
    private Long userId;
    private String sessionId;
    private String ipAddress;
    private String requestPath;
    private String requestBody;
    private String eventType;
    private String content;

    public Long getUserId() {
      return userId;
    }

    public void setUserId(Long userId) {
      this.userId = userId;
    }

    public String getSessionId() {
      return sessionId;
    }

    public void setSessionId(String sessionId) {
      this.sessionId = sessionId;
    }

    public String getIpAddress() {
      return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
      this.ipAddress = ipAddress;
    }

    public String getRequestPath() {
      return requestPath;
    }

    public void setRequestPath(String requestPath) {
      this.requestPath = requestPath;
    }

    public String getRequestBody() {
      return requestBody;
    }

    public void setRequestBody(String requestBody) {
      this.requestBody = requestBody;
    }

    public String getEventType() {
      return eventType;
    }

    public void setEventType(String eventType) {
      this.eventType = eventType;
    }

    public String getContent() {
      return content;
    }

    public void setContent(String content) {
      this.content = content;
    }
  }

  public static class RiskCheckResponse {
    private boolean passed;
    private String action;
    private String reason;
    private String category;
    private String matchedKeyword;
    private int statusCode;
    private String message;

    public static RiskCheckResponse passed() {
      RiskCheckResponse response = new RiskCheckResponse();
      response.setPassed(true);
      response.setStatusCode(200);
      return response;
    }

    public boolean isPassed() {
      return passed;
    }

    public void setPassed(boolean passed) {
      this.passed = passed;
    }

    public String getAction() {
      return action;
    }

    public void setAction(String action) {
      this.action = action;
    }

    public String getReason() {
      return reason;
    }

    public void setReason(String reason) {
      this.reason = reason;
    }

    public String getCategory() {
      return category;
    }

    public void setCategory(String category) {
      this.category = category;
    }

    public String getMatchedKeyword() {
      return matchedKeyword;
    }

    public void setMatchedKeyword(String matchedKeyword) {
      this.matchedKeyword = matchedKeyword;
    }

    public int getStatusCode() {
      return statusCode;
    }

    public void setStatusCode(int statusCode) {
      this.statusCode = statusCode;
    }

    public String getMessage() {
      return message;
    }

    public void setMessage(String message) {
      this.message = message;
    }
  }
}
