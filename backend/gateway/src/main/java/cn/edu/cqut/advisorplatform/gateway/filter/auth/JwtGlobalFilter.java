package cn.edu.cqut.advisorplatform.gateway.filter.auth;

import cn.edu.cqut.advisorplatform.common.trace.TraceHeaderConstants;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class JwtGlobalFilter implements GlobalFilter, Ordered {
  private static final Logger log = LoggerFactory.getLogger(JwtGlobalFilter.class);

  private static final List<String> WHITE_LIST =
      List.of(
          "/api/auth/login",
          "/api/auth/register",
          "/api/auth/__ready__",
          "/api/auth/refresh",
          "/api/auth/logout",
          "/actuator",
          "/internal/health");

  @Value("${advisor.jwt.secret:}")
  private String jwtSecret;

  private final JwtTokenSupport tokenSupport = new JwtTokenSupport();

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    if (exchange.getRequest().getMethod() == org.springframework.http.HttpMethod.OPTIONS) {
      return chain.filter(exchange);
    }
    String path = exchange.getRequest().getURI().getPath();
    boolean skip = WHITE_LIST.stream().anyMatch(path::startsWith);

    String traceId =
        Optional.ofNullable(
                exchange.getRequest().getHeaders().getFirst(TraceHeaderConstants.TRACE_ID_HEADER))
            .orElseGet(() -> UUID.randomUUID().toString());
    String token = tokenSupport.resolveBearerToken(exchange.getRequest().getHeaders());
    String userId = token == null ? null : tokenSupport.extractUserId(jwtSecret, token);
    ServerWebExchange withTrace =
        exchange
            .mutate()
            .request(
                builder -> {
                  builder.header(TraceHeaderConstants.TRACE_ID_HEADER, traceId);
                  if (userId != null) {
                    builder.header("X-User-Id", userId);
                  }
                })
            .build();

    if (skip) {
      return chain.filter(withTrace);
    }

    if (token == null) {
      log.warn("gateway jwt reject: missing bearer token, path={}, traceId={}", path, traceId);
      withTrace.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
      return withTrace.getResponse().setComplete();
    }

    ValidationResult validationResult = tokenSupport.validate(jwtSecret, token);
    if (!validationResult.valid()) {
      log.warn(
          "gateway jwt reject: path={}, traceId={}, reason={}, tokenPrefix={}",
          path,
          traceId,
          validationResult.reason(),
          tokenSupport.maskToken(token));
      withTrace.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
      return withTrace.getResponse().setComplete();
    }

    return chain.filter(withTrace);
  }

  @Override
  public int getOrder() {
    return -100;
  }
}
