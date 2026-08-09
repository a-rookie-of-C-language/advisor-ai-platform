package cn.edu.cqut.advisorplatform.gateway.filter.risk;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

class RiskControlResponseWriter {

  Mono<Void> writeBlockedResponse(ServerWebExchange exchange, RiskCheckResponse response) {
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

  Mono<Void> writeServiceUnavailableResponse(ServerWebExchange exchange) {
    exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
    exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
    String body = "{\"code\":503,\"message\":\"风控服务暂不可用，请稍后重试\"}";
    DataBuffer buffer =
        exchange.getResponse().bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
    return exchange.getResponse().writeWith(Mono.just(buffer));
  }

  private String safeTag(String value) {
    return value == null || value.isBlank() ? "unknown" : value.toLowerCase(Locale.ROOT);
  }

  private String escapeJson(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }
}
