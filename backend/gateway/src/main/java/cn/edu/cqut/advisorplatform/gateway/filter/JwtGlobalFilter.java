package cn.edu.cqut.advisorplatform.gateway.filter;

import cn.edu.cqut.advisorplatform.common.trace.TraceHeaderConstants;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class JwtGlobalFilter implements GlobalFilter, Ordered {
  private static final Logger log = LoggerFactory.getLogger(JwtGlobalFilter.class);

  private static final List<String> WHITE_LIST =
      List.of("/api/auth/login", "/api/auth/register", "/actuator", "/internal/health");

  @Value("${advisor.jwt.secret:ZGVmYXVsdC1zZWNyZXQtZGVmYXVsdC1zZWNyZXQtZGVmYXVsdC1zZWNyZXQ=}")
  private String jwtSecret;

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    boolean skip = WHITE_LIST.stream().anyMatch(path::startsWith);

    String traceId =
        Optional.ofNullable(
                exchange.getRequest().getHeaders().getFirst(TraceHeaderConstants.TRACE_ID_HEADER))
            .orElseGet(() -> UUID.randomUUID().toString());
    ServerWebExchange withTrace =
        exchange
            .mutate()
            .request(builder -> builder.header(TraceHeaderConstants.TRACE_ID_HEADER, traceId))
            .build();

    if (skip) {
      return chain.filter(withTrace);
    }

    String token = resolveBearerToken(withTrace.getRequest().getHeaders());
    if (token == null) {
      log.warn("gateway jwt reject: missing bearer token, path={}, traceId={}", path, traceId);
      withTrace.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
      return withTrace.getResponse().setComplete();
    }

    ValidationResult validationResult = validate(token);
    if (!validationResult.valid()) {
      log.warn(
          "gateway jwt reject: path={}, traceId={}, reason={}, tokenPrefix={}",
          path,
          traceId,
          validationResult.reason(),
          maskToken(token));
      withTrace.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
      return withTrace.getResponse().setComplete();
    }

    return chain.filter(withTrace);
  }

  private String resolveBearerToken(HttpHeaders headers) {
    String authHeader = headers.getFirst(HttpHeaders.AUTHORIZATION);
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  private ValidationResult validate(String token) {
    ValidationResult base64Result = validateWithBase64Key(token);
    if (base64Result.valid()) {
      return base64Result;
    }
    ValidationResult rawResult = validateWithRawKey(token);
    if (rawResult.valid()) {
      return rawResult;
    }
    return new ValidationResult(
        false, "base64=" + base64Result.reason() + ", raw=" + rawResult.reason());
  }

  private ValidationResult validateWithBase64Key(String token) {
    try {
      byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
      Key key = Keys.hmacShaKeyFor(keyBytes);
      Claims ignored =
          Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
      return new ValidationResult(true, "ok");
    } catch (Exception ex) {
      return new ValidationResult(false, ex.getClass().getSimpleName());
    }
  }

  private ValidationResult validateWithRawKey(String token) {
    try {
      Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
      Claims ignored =
          Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
      return new ValidationResult(true, "ok");
    } catch (Exception ex) {
      return new ValidationResult(false, ex.getClass().getSimpleName());
    }
  }

  private String maskToken(String token) {
    if (token == null || token.isBlank()) {
      return "";
    }
    int keep = Math.min(12, token.length());
    return token.substring(0, keep) + "...(" + token.length() + ")";
  }

  @Override
  public int getOrder() {
    return -100;
  }

  private record ValidationResult(boolean valid, String reason) {}
}
