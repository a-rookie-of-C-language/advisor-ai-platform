package cn.edu.cqut.advisorplatform.gateway.filter;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

class RiskSseResponseHandler {

  private static final Logger log = LoggerFactory.getLogger(RiskSseResponseHandler.class);

  private final MeterRegistry meterRegistry;
  private final RiskResponseBodyFactory responseBodyFactory;
  private final RiskOutputCheckClient riskOutputCheckClient;

  RiskSseResponseHandler(
      MeterRegistry meterRegistry,
      RiskResponseBodyFactory responseBodyFactory,
      RiskOutputCheckClient riskOutputCheckClient) {
    this.meterRegistry = meterRegistry;
    this.responseBodyFactory = responseBodyFactory;
    this.riskOutputCheckClient = riskOutputCheckClient;
  }

  Mono<Void> handle(
      ServerWebExchange exchange,
      Publisher<? extends DataBuffer> body,
      DataBufferFactory bufferFactory,
      ServerHttpResponse originalResponse,
      String riskControlServiceUrl,
      String internalServiceToken) {
    String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
    String path = exchange.getRequest().getURI().getPath();
    AtomicBoolean blocked = new AtomicBoolean(false);

    Flux<DataBuffer> modifiedBody =
        Flux.from(body)
            .concatMap(
                dataBuffer -> {
                  if (blocked.get()) {
                    DataBufferUtils.release(dataBuffer);
                    return Flux.<DataBuffer>empty();
                  }

                  byte[] content = new byte[dataBuffer.readableByteCount()];
                  dataBuffer.read(content);
                  DataBufferUtils.release(dataBuffer);
                  String chunk = new String(content, StandardCharsets.UTF_8);

                  return callOutputRiskCheck(
                          riskControlServiceUrl, internalServiceToken, userId, path, chunk)
                      .flatMapMany(
                          riskResponse -> {
                            if (riskResponse.isPassed()) {
                              return Flux.just(bufferFactory.wrap(content));
                            }

                            blocked.set(true);
                            Counter.builder("gateway.risk.output.block")
                                .tag("mode", "sse")
                                .tag(
                                    "category",
                                    responseBodyFactory.safeTag(riskResponse.getCategory()))
                                .register(meterRegistry)
                                .increment();

                            log.warn(
                                "SSE output blocked: userId={}, path={}, category={}",
                                userId,
                                path,
                                riskResponse.getCategory());

                            String alertEvent =
                                responseBodyFactory.sseBlockedEvent(riskResponse.getCategory());
                            return Flux.just(
                                bufferFactory.wrap(alertEvent.getBytes(StandardCharsets.UTF_8)));
                          })
                      .onErrorResume(
                          e -> {
                            log.error("SSE output risk check failed, pass chunk", e);
                            return Flux.just(bufferFactory.wrap(content));
                          });
                });

    return originalResponse.writeWith(modifiedBody);
  }

  private Mono<RiskCheckResponse> callOutputRiskCheck(
      String riskControlServiceUrl,
      String internalServiceToken,
      String userId,
      String path,
      String content) {
    return riskOutputCheckClient.check(
        riskControlServiceUrl, internalServiceToken, userId, path, content);
  }
}
