package cn.edu.cqut.advisorplatform.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class InternalServiceTokenFilter extends OncePerRequestFilter {

  private final String expectedToken;

  public InternalServiceTokenFilter(@Value("${advisor.internal.token:}") String expectedToken) {
    this.expectedToken = expectedToken;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String uri = request.getRequestURI();
    if (uri == null || !uri.startsWith("/internal/")) {
      return true;
    }
    return "/internal/health".equals(uri);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = resolveToken(request);
    if (expectedToken == null
        || expectedToken.isBlank()
        || token == null
        || !expectedToken.equals(token)) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      response.setContentType("application/json;charset=UTF-8");
      response
          .getWriter()
          .write("{\"code\":401,\"message\":\"internal api unauthorized\",\"data\":null}");
      return;
    }

    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(
              "internal-service", null, List.of(new SimpleGrantedAuthority("ROLE_INTERNAL")));
      SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    filterChain.doFilter(request, response);
  }

  private String resolveToken(HttpServletRequest request) {
    String token = request.getHeader("X-Internal-Token");
    if (token != null && !token.isBlank()) {
      return token.trim();
    }

    String auth = request.getHeader("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      return auth.substring(7).trim();
    }
    return null;
  }
}
