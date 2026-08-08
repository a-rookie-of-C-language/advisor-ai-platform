package cn.edu.cqut.advisorplatform.gateway.filter.risk;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

class RiskNormalResponseHandler {

  private static final Logger log = LoggerFactory.getLogger(RiskNormalResponseHandler.class);

  private final MeterRegistry meterRegistry;
  private final RiskResponseBodyFactory responseBodyFactory;
  private final RiskOutputCheckClient riskOutputCheckClient;

  RiskNormalResponseHandler(
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
    return DataBufferUtils.join(Flux.from(body))
        .flatMap(
            dataBuffer -> {
              byte[] content = new byte[dataBuffer.readableByteCount()];
              dataBuffer.read(content);
              DataBufferUtils.release(dataBuffer);
              String responseBody = new String(content, StandardCharsets.UTF_8);

              String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
              String path = exchange.getRequest().getURI().getPath();
              return callOutputRiskCheck(
                      riskControlServiceUrl, internalServiceToken, userId, path, responseBody)
                  .flatMap(
                      riskResponse -> {
                        if (riskResponse.isPassed()) {
                          Counter.builder("gateway.risk.output.pass")
                              .tag("mode", "normal")
                              .register(meterRegistry)
                              .increment();
                          DataBuffer buffer = bufferFactory.wrap(content);
                          return originalResponse.writeWith(Mono.just(buffer));
                        }

                        Counter.builder("gateway.risk.output.block")
                            .tag("mode", "normal")
                            .tag(
                                "category", responseBodyFactory.safeTag(riskResponse.getCategory()))
                            .register(meterRegistry)
                            .increment();

                        log.warn(
                            "Output risk control blocked: userId={}, path={}, category={}",
                            userId,
                            path,
                            riskResponse.getCategory());

                        originalResponse.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                        String errorBody = responseBodyFactory.normalBlockedBody();
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
