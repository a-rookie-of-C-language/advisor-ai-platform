package cn.edu.cqut.advisorplatform.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.Setter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtUtil jwtUtil;

  @Setter private UserDetailsService userDetailsService;

  public JwtAuthenticationFilter(JwtUtil jwtUtil) {
    this.jwtUtil = jwtUtil;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    final String authHeader = request.getHeader("Authorization");
    String jwt = null;
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      jwt = authHeader.substring(7);
    }
    if (jwt == null && request.getRequestURI().startsWith("/ws/")) {
      jwt = request.getParameter("token");
    }
    if (jwt == null) {
      filterChain.doFilter(request, response);
      return;
    }
    final Claims claims;
    try {
      claims = jwtUtil.extractClaims(jwt);
    } catch (JwtException | IllegalArgumentException e) {
      filterChain.doFilter(request, response);
      return;
    }
    if (!jwtUtil.isAccessToken(claims) || jwtUtil.isTokenExpired(claims)) {
      filterChain.doFilter(request, response);
      return;
    }

    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      UserDetails principal = resolvePrincipal(claims);
      if (principal != null) {
        UsernamePasswordAuthenticationToken authToken =
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);
      }
    }
    filterChain.doFilter(request, response);
  }

  private UserDetails resolvePrincipal(Claims claims) {
    String username = claims.getSubject();
    if (username != null && !username.isBlank() && userDetailsService != null) {
      try {
        return userDetailsService.loadUserByUsername(username);
      } catch (UsernameNotFoundException ignored) {
        // fall through to lightweight principal
      }
    }
    return buildPrincipal(claims);
  }

  private UserPrincipal buildPrincipal(Claims claims) {
    if (claims == null) {
      return null;
    }
    String username = claims.getSubject();
    Long userId = parseLong(claims.get("userId"));
    if (username == null || username.isBlank() || userId == null) {
      return null;
    }

    String roleClaim = claims.get("role", String.class);
    String role = "ADVISOR";
    if (roleClaim != null && !roleClaim.isBlank()) {
      role = roleClaim.trim().toUpperCase();
    }

    return new UserPrincipal(userId, username, role);
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
