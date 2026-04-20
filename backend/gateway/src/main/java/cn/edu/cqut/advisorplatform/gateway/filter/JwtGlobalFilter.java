package cn.edu.cqut.advisorplatform.gateway.filter;

import cn.edu.cqut.advisorplatform.common.trace.TraceHeaderConstants;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtGlobalFilter implements GlobalFilter, Ordered {

    private static final List<String> WHITE_LIST = List.of("/api/auth/login", "/api/auth/register", "/actuator", "/internal/health");

    @Value("${advisor.jwt.secret:default-secret-default-secret-default-secret}")
    private String jwtSecret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        boolean skip = WHITE_LIST.stream().anyMatch(path::startsWith);

        String traceId = Optional.ofNullable(exchange.getRequest().getHeaders().getFirst(TraceHeaderConstants.TRACE_ID_HEADER))
                .orElseGet(() -> UUID.randomUUID().toString());
        ServerWebExchange withTrace = exchange.mutate()
                .request(builder -> builder.header(TraceHeaderConstants.TRACE_ID_HEADER, traceId))
                .build();

        if (skip) {
            return chain.filter(withTrace);
        }

        String token = resolveBearerToken(withTrace.getRequest().getHeaders());
        if (token == null || !validate(token)) {
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

    private boolean validate(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Claims ignored = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
