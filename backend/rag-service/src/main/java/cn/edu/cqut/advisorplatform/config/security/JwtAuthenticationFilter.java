package cn.edu.cqut.advisorplatform.config.security;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtUtil jwtUtil;

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    final String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    final String jwt = authHeader.substring(7);
    final Claims claims;
    try {
      claims = jwtUtil.extractClaims(jwt);
    } catch (JwtException | IllegalArgumentException e) {
      // token invalid or expired, let downstream security rules return unauthorized
      filterChain.doFilter(request, response);
      return;
    }
    if (!jwtUtil.isAccessToken(claims) || jwtUtil.isTokenExpired(claims)) {
      filterChain.doFilter(request, response);
      return;
    }

    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      UserDO principal = buildPrincipal(claims);
      if (principal != null) {
        UsernamePasswordAuthenticationToken authToken =
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);
      }
    }
    filterChain.doFilter(request, response);
  }

  private UserDO buildPrincipal(Claims claims) {
    if (claims == null) {
      return null;
    }
    String username = claims.getSubject();
    Long userId = parseLong(claims.get("userId"));
    if (username == null || username.isBlank() || userId == null) {
      return null;
    }

    String roleClaim = claims.get("role", String.class);
    UserDO.UserRole role = UserDO.UserRole.ADVISOR;
    if (roleClaim != null && !roleClaim.isBlank()) {
      try {
        role = UserDO.UserRole.valueOf(roleClaim.trim().toUpperCase());
      } catch (IllegalArgumentException ignored) {
        role = UserDO.UserRole.ADVISOR;
      }
    }

    UserDO user = new UserDO();
    user.setId(userId);
    user.setUsername(username);
    user.setRole(role);
    user.setEnabled(true);
    return user;
  }

  private Long parseLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    if (value instanceof String text) {
      try {
        return Long.parseLong(text);
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }
}
