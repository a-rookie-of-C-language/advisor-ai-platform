package cn.edu.cqut.advisorplatform.gateway.filter;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class RiskResponseFilter implements GlobalFilter, Ordered {

  private static final Logger log = LoggerFactory.getLogger(RiskResponseFilter.class);
  private static final List<String> RISK_CHECK_PATHS =
      List.of("/api/chat/", "/api/session/", "/api/rag/", "/api/memory/");
  private static final String SSE_MEDIA_TYPE = "text/event-stream";

  @Value("${advisor.risk.control-service-url:http://risk-control-service:8086}")
  private String riskControlServiceUrl;

  private final WebClient webClient;

  public RiskResponseFilter(WebClient.Builder webClientBuilder) {
    this.webClient = webClientBuilder.build();
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

    ServerHttpResponse originalResponse = exchange.getResponse();
    DataBufferFactory bufferFactory = originalResponse.bufferFactory();

    ServerHttpResponseDecorator decoratedResponse =
        new ServerHttpResponseDecorator(originalResponse) {
          @Override
          public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
            MediaType contentType = originalResponse.getHeaders().getContentType();

            if (contentType != null && contentType.toString().contains(SSE_MEDIA_TYPE)) {
              return handleSseResponse(exchange, body, bufferFactory, originalResponse);
            }

            return handleNormalResponse(exchange, body, bufferFactory, originalResponse);
          }

          @Override
          public Mono<Void> writeAndFlushWith(
              Publisher<? extends Publisher<? extends DataBuffer>> body) {
            MediaType contentType = originalResponse.getHeaders().getContentType();

            if (contentType != null && contentType.toString().contains(SSE_MEDIA_TYPE)) {
              return handleSseFlushResponse(exchange, body, bufferFactory, originalResponse);
            }

            return super.writeAndFlushWith(body);
          }
        };

    return chain.filter(exchange.mutate().response(decoratedResponse).build());
  }

  private Mono<Void> handleNormalResponse(
      ServerWebExchange exchange,
      Publisher<? extends DataBuffer> body,
      DataBufferFactory bufferFactory,
      ServerHttpResponse originalResponse) {

    return DataBufferUtils.join(Flux.from(body))
        .flatMap(
            dataBuffer -> {
              byte[] content = new byte[dataBuffer.readableByteCount()];
              dataBuffer.read(content);
              DataBufferUtils.release(dataBuffer);
              String responseBody = new String(content, StandardCharsets.UTF_8);

              String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
              String path = exchange.getRequest().getURI().getPath();

              return callOutputRiskCheck(userId, path, responseBody)
                  .flatMap(
                      riskResponse -> {
                        if (riskResponse.isPassed()) {
                          DataBuffer buffer = bufferFactory.wrap(content);
                          return originalResponse.writeWith(Mono.just(buffer));
                        }

                        log.warn(
                            "Output risk control blocked: userId={}, path={}, category={}",
                            userId,
                            path,
                            riskResponse.getCategory());

                        originalResponse.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                        String errorBody = "{\"code\":451,\"message\":\"内容不合规，已被过滤\"}";
                        byte[] errorBytes = errorBody.getBytes(StandardCharsets.UTF_8);
                        originalResponse.getHeaders().setContentLength(errorBytes.length);
                        DataBuffer buffer = bufferFactory.wrap(errorBytes);
                        return originalResponse.writeWith(Mono.just(buffer));
                      })
                  .onErrorResume(
                      e -> {
                        log.error("Output risk check failed, passing through", e);
                        DataBuffer buffer = bufferFactory.wrap(content);
                        return originalResponse.writeWith(Mono.just(buffer));
                      });
            });
  }

  private Mono<Void> handleSseResponse(
      ServerWebExchange exchange,
      Publisher<? extends DataBuffer> body,
      DataBufferFactory bufferFactory,
      ServerHttpResponse originalResponse) {

    StringBuilder contentCollector = new StringBuilder();

    Flux<DataBuffer> modifiedBody =
        Flux.from(body)
            .map(
                dataBuffer -> {
                  byte[] content = new byte[dataBuffer.readableByteCount()];
                  dataBuffer.read(content);
                  DataBufferUtils.release(dataBuffer);
                  String chunk = new String(content, StandardCharsets.UTF_8);
                  contentCollector.append(chunk);
                  return bufferFactory.wrap(content);
                })
            .concatWith(
                Mono.defer(
                    () -> {
                      String fullContent = contentCollector.toString();
                      String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
                      String path = exchange.getRequest().getURI().getPath();

                      return callOutputRiskCheck(userId, path, fullContent)
                          .flatMap(
                              riskResponse -> {
                                if (riskResponse.isPassed()) {
                                  return Mono.<DataBuffer>empty();
                                }

                                log.warn(
                                    "SSE output risk alert: userId={}, path={}, category={}",
                                    userId,
                                    path,
                                    riskResponse.getCategory());

                                String alertEvent =
                                    "event: risk_alert\ndata: "
                                        + "{\"code\":451,\"message\":\"内容不合规，已被过滤\","
                                        + "\"category\":\""
                                        + riskResponse.getCategory()
                                        + "\"}\n\n";
                                return Mono.just(
                                    bufferFactory.wrap(
                                        alertEvent.getBytes(StandardCharsets.UTF_8)));
                              })
                          .onErrorResume(
                              e -> {
                                log.error("SSE output risk check failed", e);
                                return Mono.empty();
                              });
                    }));

    return originalResponse.writeWith(modifiedBody);
  }

  private Mono<Void> handleSseFlushResponse(
      ServerWebExchange exchange,
      Publisher<? extends Publisher<? extends DataBuffer>> body,
      DataBufferFactory bufferFactory,
      ServerHttpResponse originalResponse) {

    StringBuilder contentCollector = new StringBuilder();

    Flux<Flux<DataBuffer>> modifiedBody =
        Flux.from(body)
            .map(
                publisher ->
                    Flux.from(publisher)
                        .map(
                            dataBuffer -> {
                              byte[] content = new byte[dataBuffer.readableByteCount()];
                              dataBuffer.read(content);
                              DataBufferUtils.release(dataBuffer);
                              String chunk = new String(content, StandardCharsets.UTF_8);
                              contentCollector.append(chunk);
                              return (DataBuffer) bufferFactory.wrap(content);
                            }))
            .concatWith(
                Mono.defer(
                    () -> {
                      String fullContent = contentCollector.toString();
                      String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
                      String path = exchange.getRequest().getURI().getPath();

                      return callOutputRiskCheck(userId, path, fullContent)
                          .flatMap(
                              riskResponse -> {
                                if (riskResponse.isPassed()) {
                                  return Mono.<Flux<DataBuffer>>empty();
                                }

                                log.warn(
                                    "SSE flush output risk alert: userId={}, path={}",
                                    userId,
                                    path);

                                String alertEvent =
                                    "event: risk_alert\ndata: "
                                        + "{\"code\":451,\"message\":\"内容不合规，已被过滤\","
                                        + "\"category\":\""
                                        + riskResponse.getCategory()
                                        + "\"}\n\n";
                                DataBuffer buffer =
                                    bufferFactory.wrap(alertEvent.getBytes(StandardCharsets.UTF_8));
                                return Mono.just(Flux.just(buffer));
                              })
                          .onErrorResume(
                              e -> {
                                log.error("SSE flush output risk check failed", e);
                                return Mono.empty();
                              });
                    }));

    return originalResponse.writeAndFlushWith(modifiedBody);
  }

  private Mono<RiskControlFilter.RiskCheckResponse> callOutputRiskCheck(
      String userId, String path, String content) {

    RiskControlFilter.RiskCheckRequest request = new RiskControlFilter.RiskCheckRequest();
    request.setUserId(userId != null ? Long.parseLong(userId) : null);
    request.setIpAddress("internal");
    request.setRequestPath(path);
    request.setContent(content);
    request.setDirection("OUTPUT");

    return webClient
        .post()
        .uri(riskControlServiceUrl + "/internal/risk/check")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(RiskControlFilter.RiskCheckResponse.class)
        .defaultIfEmpty(RiskControlFilter.RiskCheckResponse.passed());
  }

  @Override
  public int getOrder() {
    return -1;
  }
}
