package cn.edu.cqut.advisorplatform.common.security;

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

  @Value("${advisor.jwt.secret}")
  private String secretKey;

  @Value("${advisor.jwt.expiration}")
  private long jwtExpiration;

  @Value("${advisor.jwt.refresh-expiration:604800000}")
  private long refreshExpiration;

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

  public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
    return buildToken(extraClaims, userDetails.getUsername(), jwtExpiration);
  }

  public String generateToken(UserDetails userDetails) {
    return generateToken(new HashMap<>(), userDetails);
  }

  public String generateToken(String username, Map<String, Object> extraClaims) {
    return buildToken(extraClaims, username, jwtExpiration);
  }

  public String generateToken(String username) {
    return generateToken(username, new HashMap<>());
  }

  public String generateAccessToken(Map<String, Object> extraClaims, UserDetails userDetails) {
    Map<String, Object> claims = new HashMap<>(extraClaims);
    claims.put("type", "access");
    return buildToken(claims, userDetails.getUsername(), jwtExpiration);
  }

  public String generateAccessToken(Map<String, Object> extraClaims, String username) {
    Map<String, Object> claims = new HashMap<>(extraClaims);
    claims.put("type", "access");
    return buildToken(claims, username, jwtExpiration);
  }

  public String generateRefreshToken(Map<String, Object> extraClaims, UserDetails userDetails) {
    Map<String, Object> claims = new HashMap<>(extraClaims);
    claims.put("type", "refresh");
    return buildToken(claims, userDetails.getUsername(), refreshExpiration);
  }

  public String generateRefreshToken(Map<String, Object> extraClaims, String username) {
    Map<String, Object> claims = new HashMap<>(extraClaims);
    claims.put("type", "refresh");
    return buildToken(claims, username, refreshExpiration);
  }

  public long getAccessExpiresInSeconds() {
    return jwtExpiration / 1000;
  }

  public long getRefreshExpiresInSeconds() {
    return refreshExpiration / 1000;
  }

  public boolean isTokenValid(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
  }

  public boolean isTokenValid(String token, String username) {
    final String extractedUsername = extractUsername(token);
    return extractedUsername.equals(username) && !isTokenExpired(token);
  }

  public boolean isTokenExpired(Claims claims) {
    return claims == null
        || claims.getExpiration() == null
        || claims.getExpiration().before(new Date());
  }

  public boolean isAccessToken(Claims claims) {
    if (claims == null) {
      return false;
    }
    String type = claims.get("type", String.class);
    return type == null || "access".equalsIgnoreCase(type);
  }

  public boolean isRefreshToken(Claims claims) {
    if (claims == null) {
      return false;
    }
    String type = claims.get("type", String.class);
    return "refresh".equalsIgnoreCase(type);
  }

  private String buildToken(Map<String, Object> extraClaims, String username, long expiration) {
    return Jwts.builder()
        .setClaims(extraClaims)
        .setSubject(username)
        .setIssuedAt(new Date(System.currentTimeMillis()))
        .setExpiration(new Date(System.currentTimeMillis() + expiration))
        .signWith(getSignInKey(), SignatureAlgorithm.HS256)
        .compact();
  }

  private boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
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
