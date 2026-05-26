package cn.edu.cqut.advisorplatform.gateway.filter;

import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RiskControlSupport {

  private static final Logger log = LoggerFactory.getLogger(RiskControlSupport.class);

  @Value("${advisor.risk.control-service-url:http://risk-control-service:8086}")
  private String riskControlServiceUrl;

  @Value("${INTERNAL_SERVICE_TOKEN:${advisor.internal.token:}}")
  private String internalServiceToken;

  @Value("${advisor.risk.fail-open-default:true}")
  private boolean failOpenDefault;

  @Value("${advisor.risk.fail-closed-paths:/api/chat/,/api/rag/}")
  private String failClosedPaths;

  private final RiskControlResponseWriter responseWriter = new RiskControlResponseWriter();
  private final RiskControlPathPolicy pathPolicy = new RiskControlPathPolicy();
  private final RiskInputCheckClient riskInputCheckClient;
  private final RiskInputMetricsSupport metricsSupport;
  private final RiskRequestBodySupport requestBodySupport = new RiskRequestBodySupport();

  public RiskControlSupport(WebClient.Builder webClientBuilder, MeterRegistry meterRegistry) {
    WebClient webClient = webClientBuilder.build();
    this.riskInputCheckClient = new RiskInputCheckClient(webClient);
    this.metricsSupport = new RiskInputMetricsSupport(meterRegistry, pathPolicy);
  }

  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    if (!pathPolicy.shouldCheck(path) || exchange.getRequest().getMethod() != HttpMethod.POST) {
      return chain.filter(exchange);
    }

    RiskInputRequestContext context = RiskInputRequestContext.from(exchange);
    return requestBodySupport
        .readBody(exchange)
        .flatMap(bytes -> handleRequest(exchange, chain, context, bytes))
        .onErrorResume(e -> handleFailure(exchange, chain, context.getPath(), e));
  }

  private Mono<Void> handleRequest(
      ServerWebExchange exchange,
      GatewayFilterChain chain,
      RiskInputRequestContext context,
      byte[] bytes) {
    String requestBody = new String(bytes, StandardCharsets.UTF_8);
    return callRiskControlService(context, requestBody)
        .flatMap(
            response -> {
              if (response.isPassed()) {
                metricsSupport.recordPass(context.getPath());
                ServerHttpRequest decoratedRequest =
                    requestBodySupport.decorateRequest(exchange, bytes);
                return chain.filter(exchange.mutate().request(decoratedRequest).build());
              }

              metricsSupport.recordBlock(context.getPath(), response);

              log.warn(
                  "Risk control blocked: userId={}, path={}, category={}, reason={}",
                  context.getUserId(),
                  context.getPath(),
                  response.getCategory(),
                  response.getReason());
              return responseWriter.writeBlockedResponse(exchange, response);
            });
  }

  private Mono<Void> handleFailure(
      ServerWebExchange exchange, GatewayFilterChain chain, String path, Throwable error) {
    boolean failClosed = pathPolicy.shouldFailClosed(path, failOpenDefault, failClosedPaths);
    metricsSupport.recordError(path, failClosed);

    log.error(
        "Risk control service call failed: path={}, mode={}",
        path,
        failClosed ? "fail_closed" : "fail_open",
        error);

    if (!failClosed) {
      return chain.filter(exchange);
    }
    return responseWriter.writeServiceUnavailableResponse(exchange);
  }

  private Mono<RiskCheckResponse> callRiskControlService(
      RiskInputRequestContext context, String requestBody) {
    return riskInputCheckClient.check(
        riskControlServiceUrl,
        internalServiceToken,
        context.getUserId(),
        context.getSessionId(),
        context.getIpAddress(),
        context.getPath(),
        requestBody);
  }
}
