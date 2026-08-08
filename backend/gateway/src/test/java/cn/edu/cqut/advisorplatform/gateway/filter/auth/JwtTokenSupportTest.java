package cn.edu.cqut.advisorplatform.gateway.filter.auth;

import static org.assertj.core.api.Assertions.assertThat;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Encoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class JwtTokenSupportTest {

  private static final String RAW_SECRET = "0123456789abcdef0123456789abcdef";
  private static final String BASE64_SECRET =
      Encoders.BASE64.encode(RAW_SECRET.getBytes(StandardCharsets.UTF_8));

  private final JwtTokenSupport tokenSupport = new JwtTokenSupport();

  @Test
  void resolveBearerTokenReturnsTokenOnlyForBearerHeader() {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth("abc.def");

    assertThat(tokenSupport.resolveBearerToken(headers)).isEqualTo("abc.def");
    assertThat(tokenSupport.resolveBearerToken(new HttpHeaders())).isNull();
  }

  @Test
  void validateAcceptsBase64AndRawSecrets() {
    String base64Token = token(BASE64_SECRET, true, Map.of("type", "access", "userId", 12L));
    String rawToken = token(RAW_SECRET, false, Map.of("type", "access", "userId", "15"));

    assertThat(tokenSupport.validate(BASE64_SECRET, base64Token).valid()).isTrue();
    assertThat(tokenSupport.validate(RAW_SECRET, rawToken).valid()).isTrue();
    assertThat(tokenSupport.extractUserId(BASE64_SECRET, base64Token)).isEqualTo("12");
    assertThat(tokenSupport.extractUserId(RAW_SECRET, rawToken)).isEqualTo("15");
  }

  @Test
  void validateRejectsRefreshToken() {
    String token = token(BASE64_SECRET, true, Map.of("type", "refresh", "userId", 12L));

    ValidationResult result = tokenSupport.validate(BASE64_SECRET, token);

    assertThat(result.valid()).isFalse();
    assertThat(result.reason()).contains("invalid_token_type");
    assertThat(tokenSupport.extractUserId(BASE64_SECRET, token)).isNull();
  }

  @Test
  void maskTokenKeepsShortPreviewOnly() {
    assertThat(tokenSupport.maskToken("abcdefghijklmnop")).isEqualTo("abcdefghijkl...(16)");
    assertThat(tokenSupport.maskToken(null)).isEmpty();
  }

  private String token(String secret, boolean base64, Map<String, Object> claims) {
    Key key =
        base64
            ? Keys.hmacShaKeyFor(io.jsonwebtoken.io.Decoders.BASE64.decode(secret))
            : Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    return Jwts.builder()
        .setClaims(claims)
        .setSubject("tester")
        .setIssuedAt(new Date(System.currentTimeMillis()))
        .setExpiration(new Date(System.currentTimeMillis() + 60_000))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }
}
