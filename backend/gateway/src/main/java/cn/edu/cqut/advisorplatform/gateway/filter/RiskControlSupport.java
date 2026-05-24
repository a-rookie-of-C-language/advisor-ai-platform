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
public class RiskControlSupport {

  private static final Logger log = LoggerFactory.getLogger(RiskControlSupport.class);
  private static final List<String> RISK_CHECK_PATHS =
      List.of("/api/chat/", "/api/session/", "/api/rag/", "/api/memory/");

  @Value("${advisor.risk.control-service-url:http://risk-control-service:8086}")
  private String riskControlServiceUrl;

  @Value("${INTERNAL_SERVICE_TOKEN:${advisor.internal.token:}}")
  private String internalServiceToken;

  @Value("${advisor.risk.fail-open-default:true}")
  private boolean failOpenDefault;

  @Value("${advisor.risk.fail-closed-paths:/api/chat/,/api/rag/}")
  private String failClosedPaths;

  private final WebClient webClient;
  private final MeterRegistry meterRegistry;

  public RiskControlSupport(WebClient.Builder webClientBuilder, MeterRegistry meterRegistry) {
    this.webClient = webClientBuilder.build();
    this.meterRegistry = meterRegistry;
  }

  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    if (!shouldCheck(path) || exchange.getRequest().getMethod() != HttpMethod.POST) {
      return chain.filter(exchange);
    }

    String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
    String sessionId = exchange.getRequest().getHeaders().getFirst("X-Session-Id");
    String ipAddress =
        exchange.getRequest().getRemoteAddress() != null
            ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
            : "unknown";

    return DataBufferUtils.join(exchange.getRequest().getBody())
        .map(
            dataBuffer -> {
              byte[] bytes = new byte[dataBuffer.readableByteCount()];
              dataBuffer.read(bytes);
              DataBufferUtils.release(dataBuffer);
              return bytes;
            })
        .defaultIfEmpty(new byte[0])
        .flatMap(bytes -> handleRequest(exchange, chain, path, userId, sessionId, ipAddress, bytes))
        .onErrorResume(e -> handleFailure(exchange, chain, path, e));
  }

  private Mono<Void> handleRequest(
      ServerWebExchange exchange,
      GatewayFilterChain chain,
      String path,
      String userId,
      String sessionId,
      String ipAddress,
      byte[] bytes) {
    String requestBody = new String(bytes, StandardCharsets.UTF_8);
    return callRiskControlService(userId, sessionId, ipAddress, path, requestBody)
        .flatMap(
            response -> {
              if (response.isPassed()) {
                Counter.builder("gateway.risk.input.pass")
                    .tag("path", normalizePathTag(path))
                    .register(meterRegistry)
                    .increment();
                ServerHttpRequest decoratedRequest = decorateRequest(exchange, bytes);
                return chain.filter(exchange.mutate().request(decoratedRequest).build());
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
              return writeBlockedResponse(exchange, response);
            });
  }

  private Mono<Void> handleFailure(
      ServerWebExchange exchange, GatewayFilterChain chain, String path, Throwable error) {
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
        error);

    if (!failClosed) {
      return chain.filter(exchange);
    }
    return writeServiceUnavailableResponse(exchange);
  }

  private ServerHttpRequest decorateRequest(ServerWebExchange exchange, byte[] bytes) {
    return new ServerHttpRequestDecorator(exchange.getRequest()) {
      @Override
      public Flux<DataBuffer> getBody() {
        if (bytes.length == 0) {
          return Flux.empty();
        }
        return Flux.just(exchange.getResponse().bufferFactory().wrap(bytes));
      }
    };
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
        .header("X-Internal-Token", internalServiceToken)
        .bodyValue(request)
        .retrieve()
        .bodyToMono(RiskCheckResponse.class)
        .defaultIfEmpty(RiskCheckResponse.passed());
  }

  private boolean shouldCheck(String path) {
    return RISK_CHECK_PATHS.stream().anyMatch(path::startsWith);
  }

  private boolean shouldFailClosed(String path) {
    Set<String> paths =
        List.of((failClosedPaths == null ? "" : failClosedPaths).split(",")).stream()
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .collect(Collectors.toSet());
    return paths.stream().anyMatch(path::startsWith) || !failOpenDefault;
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

  private Mono<Void> writeBlockedResponse(ServerWebExchange exchange, RiskCheckResponse response) {
    exchange
        .getResponse()
        .setStatusCode(HttpStatus.valueOf(Math.max(response.getStatusCode(), 400)));
    exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

    String errorBody =
        String.format(
            "{\"code\":%d,\"message\":\"%s\",\"action\":\"%s\"}",
            Math.max(response.getStatusCode(), 400),
            escapeJson(response.getMessage() == null ? "请求被风控拦截" : response.getMessage()),
            safeTag(response.getAction()));
    DataBuffer buffer =
        exchange.getResponse().bufferFactory().wrap(errorBody.getBytes(StandardCharsets.UTF_8));
    return exchange.getResponse().writeWith(Mono.just(buffer));
  }

  private Mono<Void> writeServiceUnavailableResponse(ServerWebExchange exchange) {
    exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
    exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
    String body = "{\"code\":503,\"message\":\"风控服务暂不可用，请稍后重试\"}";
    DataBuffer buffer =
        exchange.getResponse().bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
    return exchange.getResponse().writeWith(Mono.just(buffer));
  }

  private String escapeJson(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }
}
