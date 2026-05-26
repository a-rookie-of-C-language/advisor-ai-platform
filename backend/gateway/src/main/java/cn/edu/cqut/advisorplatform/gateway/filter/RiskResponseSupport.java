package cn.edu.cqut.advisorplatform.gateway.filter;

import io.micrometer.core.instrument.MeterRegistry;
import org.reactivestreams.Publisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class RiskResponseSupport {

  private static final String SSE_MEDIA_TYPE = "text/event-stream";

  @Value("${advisor.risk.control-service-url:http://risk-control-service:8086}")
  private String riskControlServiceUrl;

  @Value("${INTERNAL_SERVICE_TOKEN:${advisor.internal.token:}}")
  private String internalServiceToken;

  private final RiskNormalResponseHandler normalResponseHandler;
  private final RiskSseResponseHandler sseResponseHandler;

  public RiskResponseSupport(WebClient.Builder webClientBuilder, MeterRegistry meterRegistry) {
    WebClient webClient = webClientBuilder.build();
    RiskResponseBodyFactory responseBodyFactory = new RiskResponseBodyFactory();
    RiskOutputCheckClient riskOutputCheckClient = new RiskOutputCheckClient(webClient);
    this.normalResponseHandler =
        new RiskNormalResponseHandler(meterRegistry, responseBodyFactory, riskOutputCheckClient);
    this.sseResponseHandler =
        new RiskSseResponseHandler(meterRegistry, responseBodyFactory, riskOutputCheckClient);
  }

  public Mono<Void> filter(
      ServerWebExchange exchange,
      org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {
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
              Flux<DataBuffer> merged = Flux.from(body).concatMap(Flux::from);
              return handleSseResponse(exchange, merged, bufferFactory, originalResponse);
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
    return normalResponseHandler.handle(
        exchange,
        body,
        bufferFactory,
        originalResponse,
        riskControlServiceUrl,
        internalServiceToken);
  }

  private Mono<Void> handleSseResponse(
      ServerWebExchange exchange,
      Publisher<? extends DataBuffer> body,
      DataBufferFactory bufferFactory,
      ServerHttpResponse originalResponse) {
    return sseResponseHandler.handle(
        exchange,
        body,
        bufferFactory,
        originalResponse,
        riskControlServiceUrl,
        internalServiceToken);
  }
}
