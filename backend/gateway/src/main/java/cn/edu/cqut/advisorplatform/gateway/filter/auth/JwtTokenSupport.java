package cn.edu.cqut.advisorplatform.gateway.filter.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import org.springframework.http.HttpHeaders;

class JwtTokenSupport {

  String resolveBearerToken(HttpHeaders headers) {
    String authHeader = headers.getFirst(HttpHeaders.AUTHORIZATION);
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  ValidationResult validate(String jwtSecret, String token) {
    ValidationResult base64Result = validateWithBase64Key(jwtSecret, token);
    if (base64Result.valid()) {
      return base64Result;
    }
    ValidationResult rawResult = validateWithRawKey(jwtSecret, token);
    if (rawResult.valid()) {
      return rawResult;
    }
    return new ValidationResult(
        false, "base64=" + base64Result.reason() + ", raw=" + rawResult.reason());
  }

  String extractUserId(String jwtSecret, String token) {
    Claims claims = parseClaims(jwtSecret, token);
    if (claims == null) {
      return null;
    }
    Object userId = claims.get("userId");
    if (userId instanceof Number number) {
      return String.valueOf(number.longValue());
    }
    if (userId instanceof String value) {
      try {
        return String.valueOf(Long.parseLong(value));
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  String maskToken(String token) {
    if (token == null || token.isBlank()) {
      return "";
    }
    int keep = Math.min(12, token.length());
    return token.substring(0, keep) + "...(" + token.length() + ")";
  }

  private Claims parseClaims(String jwtSecret, String token) {
    Claims claims = parseClaimsWithBase64Key(jwtSecret, token);
    if (claims != null) {
      return claims;
    }
    return parseClaimsWithRawKey(jwtSecret, token);
  }

  private ValidationResult validateWithBase64Key(String jwtSecret, String token) {
    try {
      return validateWithKey(base64Key(jwtSecret), token);
    } catch (Exception ex) {
      return new ValidationResult(false, ex.getClass().getSimpleName());
    }
  }

  private ValidationResult validateWithRawKey(String jwtSecret, String token) {
    try {
      return validateWithKey(rawKey(jwtSecret), token);
    } catch (Exception ex) {
      return new ValidationResult(false, ex.getClass().getSimpleName());
    }
  }

  private Claims parseClaimsWithBase64Key(String jwtSecret, String token) {
    try {
      Claims claims = parseClaimsWithKey(base64Key(jwtSecret), token);
      return isAccessToken(claims) ? claims : null;
    } catch (Exception ex) {
      return null;
    }
  }

  private Claims parseClaimsWithRawKey(String jwtSecret, String token) {
    try {
      Claims claims = parseClaimsWithKey(rawKey(jwtSecret), token);
      return isAccessToken(claims) ? claims : null;
    } catch (Exception ex) {
      return null;
    }
  }

  private ValidationResult validateWithKey(Key key, String token) {
    Claims claims = parseClaimsWithKey(key, token);
    if (!isAccessToken(claims)) {
      return new ValidationResult(false, "invalid_token_type");
    }
    return new ValidationResult(true, "ok");
  }

  private Claims parseClaimsWithKey(Key key, String token) {
    return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
  }

  private Key base64Key(String jwtSecret) {
    byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
    return Keys.hmacShaKeyFor(keyBytes);
  }

  private Key rawKey(String jwtSecret) {
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
  }

  private boolean isAccessToken(Claims claims) {
    if (claims == null) {
      return false;
    }
    String type = claims.get("type", String.class);
    return type == null || "access".equalsIgnoreCase(type);
  }
}
