package cn.edu.cqut.advisorplatform.gateway.filter;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
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
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class RiskControlFilter implements GlobalFilter, Ordered {

  private static final Logger log = LoggerFactory.getLogger(RiskControlFilter.class);
  private static final List<String> RISK_CHECK_PATHS =
      List.of("/api/chat/", "/api/session/", "/api/rag/", "/api/memory/");

  @Value("${advisor.risk.control-service-url:http://risk-control-service:8086}")
  private String riskControlServiceUrl;

  @Value("${advisor.risk.fail-open-default:true}")
  private boolean failOpenDefault;

  @Value("${advisor.risk.fail-closed-paths:/api/chat/,/api/rag/}")
  private String failClosedPaths;

  private final WebClient webClient;
  private final MeterRegistry meterRegistry;

  public RiskControlFilter(WebClient.Builder webClientBuilder, MeterRegistry meterRegistry) {
    this.webClient = webClientBuilder.build();
    this.meterRegistry = meterRegistry;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();

    boolean needCheck = RISK_CHECK_PATHS.stream().anyMatch(path::startsWith);
    if (!needCheck) {
      return chain.filter(exchange);
    }

    if (exchange.getRequest().getMethod() != HttpMethod.POST) {
      return chain.filter(exchange);
    }

    String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
    String sessionId = exchange.getRequest().getHeaders().getFirst("X-Session-Id");
    String ipAddress =
        exchange.getRequest().getRemoteAddress() != null
            ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
            : "unknown";

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
                          Counter.builder("gateway.risk.input.pass")
                              .tag("path", normalizePathTag(path))
                              .register(meterRegistry)
                              .increment();

                          ServerHttpRequest decoratedRequest =
                              new ServerHttpRequestDecorator(exchange.getRequest()) {
                                @Override
                                public Flux<DataBuffer> getBody() {
                                  DataBuffer buffer =
                                      exchange.getResponse().bufferFactory().wrap(bytes);
                                  return Flux.just(buffer);
                                }
                              };
                          ServerWebExchange mutatedExchange =
                              exchange.mutate().request(decoratedRequest).build();
                          return chain.filter(mutatedExchange);
                        }

                        Counter.builder("gateway.risk.input.block")
                            .tag("path", normalizePathTag(path))
                            .tag("category", safeTag(response.getCategory()))
                            .tag("action", safeTag(response.getAction()))
                            .register(meterRegistry)
                            .increment();

                        log.warn(
                            "Risk control blocked: userId={}, path={}, category={}, reason={}",
                            userId,
                            path,
                            response.getCategory(),
                            response.getReason());

                        exchange
                            .getResponse()
                            .setStatusCode(
                                HttpStatus.valueOf(Math.max(response.getStatusCode(), 400)));
                        exchange
                            .getResponse()
                            .getHeaders()
                            .setContentType(MediaType.APPLICATION_JSON);

                        String errorBody =
                            String.format(
                                "{\"code\":%d,\"message\":\"%s\",\"action\":\"%s\"}",
                                Math.max(response.getStatusCode(), 400),
                                escapeJson(
                                    response.getMessage() == null
                                        ? "请求被风控拦截"
                                        : response.getMessage()),
                                safeTag(response.getAction()));

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
              boolean failClosed = shouldFailClosed(path);
              Counter.builder("gateway.risk.input.error")
                  .tag("path", normalizePathTag(path))
                  .tag("mode", failClosed ? "fail_closed" : "fail_open")
                  .register(meterRegistry)
                  .increment();

              log.error(
                  "Risk control service call failed: path={}, mode={}",
                  path,
                  failClosed ? "fail_closed" : "fail_open",
                  e);

              if (!failClosed) {
                return chain.filter(exchange);
              }

              exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
              exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
              String body = "{\"code\":503,\"message\":\"风控服务暂不可用，请稍后重试\"}";
              DataBuffer buffer =
                  exchange
                      .getResponse()
                      .bufferFactory()
                      .wrap(body.getBytes(StandardCharsets.UTF_8));
              return exchange.getResponse().writeWith(Mono.just(buffer));
            });
  }

  private Mono<RiskCheckResponse> callRiskControlService(
      String userId, String sessionId, String ipAddress, String path, String requestBody) {

    RiskCheckRequest request = new RiskCheckRequest();
    request.setUserId(parseUserId(userId));
    request.setSessionId(sessionId);
    request.setIpAddress(ipAddress);
    request.setRequestPath(path);
    request.setRequestBody(requestBody);
    request.setContent(requestBody);
    request.setDirection("INPUT");

    return webClient
        .post()
        .uri(riskControlServiceUrl + "/internal/risk/check")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(RiskCheckResponse.class)
        .defaultIfEmpty(RiskCheckResponse.passed());
  }

  private boolean shouldFailClosed(String path) {
    Set<String> paths =
        List.of(failClosedPaths.split(",")).stream()
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .collect(Collectors.toSet());
    boolean inFailClosedList = paths.stream().anyMatch(path::startsWith);
    if (inFailClosedList) {
      return true;
    }
    return !failOpenDefault;
  }

  private Long parseUserId(String userId) {
    if (userId == null || userId.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(userId);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private String normalizePathTag(String path) {
    for (String prefix : RISK_CHECK_PATHS) {
      if (path.startsWith(prefix)) {
        return prefix;
      }
    }
    return "other";
  }

  private String safeTag(String value) {
    return value == null || value.isBlank() ? "unknown" : value.toLowerCase(Locale.ROOT);
  }

  private String escapeJson(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }

  @Override
  public int getOrder() {
    return -50;
  }

  public static class RiskCheckRequest {
    private Long userId;
    private String sessionId;
    private String ipAddress;
    private String requestPath;
    private String requestBody;
    private String eventType;
    private String content;
    private String direction;

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

    public String getDirection() {
      return direction;
    }

    public void setDirection(String direction) {
      this.direction = direction;
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
