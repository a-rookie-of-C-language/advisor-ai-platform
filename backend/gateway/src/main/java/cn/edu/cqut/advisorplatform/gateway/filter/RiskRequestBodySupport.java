package cn.edu.cqut.advisorplatform.gateway.filter;

import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class RiskRequestBodySupport {

  public Mono<byte[]> readBody(ServerWebExchange exchange) {
    return DataBufferUtils.join(exchange.getRequest().getBody())
        .map(this::readAndRelease)
        .defaultIfEmpty(new byte[0]);
  }

  public ServerHttpRequest decorateRequest(ServerWebExchange exchange, byte[] bytes) {
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

  private byte[] readAndRelease(DataBuffer dataBuffer) {
    byte[] bytes = new byte[dataBuffer.readableByteCount()];
    dataBuffer.read(bytes);
    DataBufferUtils.release(dataBuffer);
    return bytes;
  }
}
