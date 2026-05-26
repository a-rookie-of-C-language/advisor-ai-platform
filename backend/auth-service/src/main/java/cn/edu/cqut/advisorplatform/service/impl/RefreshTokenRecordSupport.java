package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.AuthRefreshTokenDao;
import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenRecordSupport {

  private final AuthRefreshTokenDao authRefreshTokenDao;
  private final RefreshTokenPayloadFactory payloadFactory = new RefreshTokenPayloadFactory();
  private final RefreshTokenHashSupport hashSupport = new RefreshTokenHashSupport();

  public Optional<AuthRefreshTokenDO> findActiveToken(String refreshToken, LocalDateTime now) {
    String tokenHash = hashSupport.hashToken(refreshToken);
    return authRefreshTokenDao.findByTokenHashAndRevokedFalseAndExpiresAtAfter(tokenHash, now);
  }

  public void saveRefreshToken(Long userId, String refreshToken, long refreshExpiresInSeconds) {
    AuthRefreshTokenDO token =
        payloadFactory.createRefreshTokenRecord(
            userId,
            hashSupport.hashToken(refreshToken),
            LocalDateTime.now().plusSeconds(refreshExpiresInSeconds));
    authRefreshTokenDao.save(token);
  }

  public void revoke(AuthRefreshTokenDO token, LocalDateTime revokedAt) {
    token.setRevoked(true);
    token.setRevokedAt(revokedAt);
    authRefreshTokenDao.save(token);
  }

  public void revokeAll(Long userId, LocalDateTime now) {
    List<AuthRefreshTokenDO> activeTokens =
        authRefreshTokenDao.findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtAsc(
            userId, now);
    for (AuthRefreshTokenDO token : activeTokens) {
      token.setRevoked(true);
      token.setRevokedAt(now);
    }
    authRefreshTokenDao.saveAll(activeTokens);
  }

  public void enforceActiveLimit(Long userId, int refreshMaxActive) {
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
}
