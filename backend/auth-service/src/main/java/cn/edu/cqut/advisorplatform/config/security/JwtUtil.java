package cn.edu.cqut.advisorplatform.config.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {

  private static final String TOKEN_TYPE_CLAIM = "type";
  private static final String ACCESS_TYPE = "access";
  private static final String REFRESH_TYPE = "refresh";

  @Value("${advisor.jwt.secret}")
  private String secretKey;

  @Value("${advisor.jwt.expiration}")
  private long jwtExpiration;

  @Value("${advisor.jwt.refresh-expiration:604800000}")
  private long refreshJwtExpiration;

  public String extractUsername(String token) {
    return extractClaim(token, Claims::getSubject);
  }

  public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
    final Claims claims = extractAllClaims(token);
    return claimsResolver.apply(claims);
  }

  public Claims extractClaims(String token) {
    return extractAllClaims(token);
  }

  public String generateToken(UserDetails userDetails) {
    return generateAccessToken(new HashMap<>(), userDetails);
  }

  public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
    return generateAccessToken(extraClaims, userDetails);
  }

  public String generateAccessToken(Map<String, Object> extraClaims, UserDetails userDetails) {
    return generateTokenWithType(extraClaims, userDetails, ACCESS_TYPE, jwtExpiration);
  }

  public String generateRefreshToken(Map<String, Object> extraClaims, UserDetails userDetails) {
    return generateTokenWithType(extraClaims, userDetails, REFRESH_TYPE, refreshJwtExpiration);
  }

  public boolean isTokenValid(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
  }

  public boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }

  public boolean isTokenExpired(Claims claims) {
    return claims == null
        || claims.getExpiration() == null
        || claims.getExpiration().before(new Date());
  }

  public boolean isAccessToken(Claims claims) {
    return hasTokenType(claims, ACCESS_TYPE);
  }

  public boolean isRefreshToken(Claims claims) {
    return hasTokenType(claims, REFRESH_TYPE);
  }

  public long getAccessExpiresInSeconds() {
    return Math.max(1L, jwtExpiration / 1000L);
  }

  public long getRefreshExpiresInSeconds() {
    return Math.max(1L, refreshJwtExpiration / 1000L);
  }

  private String generateTokenWithType(
      Map<String, Object> extraClaims, UserDetails userDetails, String tokenType, long expiration) {
    Map<String, Object> claims = new HashMap<>(extraClaims);
    claims.put(TOKEN_TYPE_CLAIM, tokenType);
    return Jwts.builder()
        .setClaims(claims)
        .setSubject(userDetails.getUsername())
        .setIssuedAt(new Date(System.currentTimeMillis()))
        .setExpiration(new Date(System.currentTimeMillis() + expiration))
        .signWith(getSignInKey(), SignatureAlgorithm.HS256)
        .compact();
  }

  private boolean hasTokenType(Claims claims, String expectedType) {
    if (claims == null) {
      return false;
    }
    String type = claims.get(TOKEN_TYPE_CLAIM, String.class);
    return expectedType.equalsIgnoreCase(type);
  }

  private Date extractExpiration(String token) {
    return extractClaim(token, Claims::getExpiration);
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(getSignInKey())
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  private Key getSignInKey() {
    byte[] keyBytes = Decoders.BASE64.decode(secretKey);
    return Keys.hmacShaKeyFor(keyBytes);
  }
}
