package cn.edu.cqut.advisorplatform.service.impl.refresh;

import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.UserRole;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

class RefreshTokenPayloadFactory {

  Map<String, Object> buildClaims(UserDO user) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("userId", user.getId());
    claims.put("role", user.getRole() == null ? UserRole.ADVISOR.name() : user.getRole().name());
    return claims;
  }

  AuthRefreshTokenDO createRefreshTokenRecord(
      Long userId, String tokenHash, LocalDateTime expiresAt) {
    AuthRefreshTokenDO token = new AuthRefreshTokenDO();
    token.setUserId(userId);
    token.setTokenHash(tokenHash);
    token.setExpiresAt(expiresAt);
    token.setRevoked(false);
    return token;
  }
}
