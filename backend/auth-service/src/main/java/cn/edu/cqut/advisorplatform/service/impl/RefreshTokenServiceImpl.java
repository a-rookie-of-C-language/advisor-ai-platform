package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.common.security.JwtUtil;
import cn.edu.cqut.advisorplatform.dao.UserDao;
import cn.edu.cqut.advisorplatform.dto.response.TokenPairResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.RefreshTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

  private final UserDao userDao;
  private final JwtUtil jwtUtil;
  private final RefreshTokenRecordSupport recordSupport;
  private final RefreshTokenPayloadFactory payloadFactory = new RefreshTokenPayloadFactory();

  @Value("${advisor.jwt.refresh-max-active:10}")
  private int refreshMaxActive;

  @Override
  @Transactional
  public TokenPairResponseDTO issueTokenPair(UserDO user) {
    if (user == null || user.getId() == null) {
      throw new BadRequestException("用户信息无效");
    }

    Map<String, Object> accessClaims = payloadFactory.buildClaims(user);
    String accessToken = jwtUtil.generateAccessToken(accessClaims, user);

    Map<String, Object> refreshClaims = payloadFactory.buildClaims(user);
    refreshClaims.put("jti", UUID.randomUUID().toString());
    String refreshToken = jwtUtil.generateRefreshToken(refreshClaims, user);

    recordSupport.enforceActiveLimit(user.getId(), refreshMaxActive);
    recordSupport.saveRefreshToken(
        user.getId(), refreshToken, jwtUtil.getRefreshExpiresInSeconds());

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
    AuthRefreshTokenDO storedToken =
        recordSupport
            .findActiveToken(refreshToken, now)
            .orElseThrow(() -> new BadRequestException("refreshToken无效或已过期"));

    recordSupport.revoke(storedToken, now);

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

    LocalDateTime now = LocalDateTime.now();
    recordSupport
        .findActiveToken(refreshToken, now)
        .ifPresent(token -> recordSupport.revoke(token, now));
  }

  @Override
  @Transactional
  public void logoutAll(Long userId) {
    if (userId == null) {
      throw new BadRequestException("userId不能为空");
    }

    recordSupport.revokeAll(userId, LocalDateTime.now());
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
}
