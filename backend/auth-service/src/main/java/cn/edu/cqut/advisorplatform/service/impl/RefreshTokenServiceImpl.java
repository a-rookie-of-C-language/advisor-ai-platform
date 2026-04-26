package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.config.security.JwtUtil;
import cn.edu.cqut.advisorplatform.dao.AuthRefreshTokenDao;
import cn.edu.cqut.advisorplatform.dao.UserDao;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.RefreshTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

  private final AuthRefreshTokenDao authRefreshTokenDao;
  private final UserDao userDao;
  private final JwtUtil jwtUtil;

  @Value("${advisor.jwt.refresh-max-active:10}")
  private int refreshMaxActive;

  @Override
  @Transactional
  public TokenPairResponseDTO issueTokenPair(UserDO user) {
    if (user == null || user.getId() == null) {
      throw new BadRequestException("用户信息无效");
    }

    Map<String, Object> accessClaims = buildClaims(user);
    String accessToken = jwtUtil.generateAccessToken(accessClaims, user);

    Map<String, Object> refreshClaims = buildClaims(user);
    refreshClaims.put("jti", UUID.randomUUID().toString());
    String refreshToken = jwtUtil.generateRefreshToken(refreshClaims, user);

    enforceActiveLimit(user.getId());
    saveRefreshToken(user.getId(), refreshToken);

    return TokenPairResponseDTO.of(
        accessToken,
        refreshToken,
        jwtUtil.getAccessExpiresInSeconds(),
        jwtUtil.getRefreshExpiresInSeconds());
  }

  @Override
  @Transactional
  public TokenPairResponseDTO refresh(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new BadRequestException("refreshToken不能为空");
    }

    Claims claims = parseRefreshClaims(refreshToken);
    LocalDateTime now = LocalDateTime.now();
    String tokenHash = hashToken(refreshToken);
    AuthRefreshTokenDO storedToken =
        authRefreshTokenDao
            .findByTokenHashAndRevokedFalseAndExpiresAtAfter(tokenHash, now)
            .orElseThrow(() -> new BadRequestException("refreshToken无效或已过期"));

    storedToken.setRevoked(true);
    storedToken.setRevokedAt(now);
    authRefreshTokenDao.save(storedToken);

    String username = claims.getSubject();
    UserDO user =
        userDao.findByUsername(username).orElseThrow(() -> new NotFoundException("用户不存在"));

    return issueTokenPair(user);
  }

  @Override
  @Transactional
  public void logout(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new BadRequestException("refreshToken不能为空");
    }

    String tokenHash = hashToken(refreshToken);
    LocalDateTime now = LocalDateTime.now();
    authRefreshTokenDao
        .findByTokenHashAndRevokedFalseAndExpiresAtAfter(tokenHash, now)
        .ifPresent(
            token -> {
              token.setRevoked(true);
              token.setRevokedAt(now);
              authRefreshTokenDao.save(token);
            });
  }

  @Override
  @Transactional
  public void logoutAll(Long userId) {
    if (userId == null) {
      throw new BadRequestException("userId不能为空");
    }

    LocalDateTime now = LocalDateTime.now();
    List<AuthRefreshTokenDO> activeTokens =
        authRefreshTokenDao.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtAsc(
            userId, now);
    for (AuthRefreshTokenDO token : activeTokens) {
      token.setRevoked(true);
      token.setRevokedAt(now);
    }
    authRefreshTokenDao.saveAll(activeTokens);
  }

  private Map<String, Object> buildClaims(UserDO user) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("userId", user.getId());
    claims.put(
        "role", user.getRole() == null ? UserDO.UserRole.ADVISOR.name() : user.getRole().name());
    return claims;
  }

  private Claims parseRefreshClaims(String refreshToken) {
    final Claims claims;
    try {
      claims = jwtUtil.extractClaims(refreshToken);
    } catch (JwtException | IllegalArgumentException e) {
      throw new BadRequestException("refreshToken无效");
    }

    if (!jwtUtil.isRefreshToken(claims)) {
      throw new BadRequestException("token类型错误");
    }
    if (jwtUtil.isTokenExpired(claims)) {
      throw new BadRequestException("refreshToken已过期");
    }
    return claims;
  }

  private void enforceActiveLimit(Long userId) {
    LocalDateTime now = LocalDateTime.now();
    List<AuthRefreshTokenDO> activeTokens =
        authRefreshTokenDao.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtAsc(
            userId, now);

    int overflow = activeTokens.size() - refreshMaxActive + 1;
    if (overflow <= 0) {
      return;
    }

    for (int i = 0; i < overflow; i++) {
      AuthRefreshTokenDO token = activeTokens.get(i);
      token.setRevoked(true);
      token.setRevokedAt(now);
    }
    authRefreshTokenDao.saveAll(activeTokens.subList(0, overflow));
  }

  private void saveRefreshToken(Long userId, String refreshToken) {
    AuthRefreshTokenDO token = new AuthRefreshTokenDO();
    token.setUserId(userId);
    token.setTokenHash(hashToken(refreshToken));
    token.setExpiresAt(LocalDateTime.now().plusSeconds(jwtUtil.getRefreshExpiresInSeconds()));
    token.setRevoked(false);
    authRefreshTokenDao.save(token);
  }

  private String hashToken(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256算法不可用", e);
    }
  }
}
