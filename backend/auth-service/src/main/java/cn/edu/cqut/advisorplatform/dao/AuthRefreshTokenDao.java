package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthRefreshTokenDao extends JpaRepository<AuthRefreshTokenDO, Long> {

  Optional<AuthRefreshTokenDO> findByTokenHashAndRevokedFalseAndExpiresAtAfter(
      String tokenHash, LocalDateTime now);

  List<AuthRefreshTokenDO> findByUserIdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtAsc(
      Long userId, LocalDateTime now);
}
