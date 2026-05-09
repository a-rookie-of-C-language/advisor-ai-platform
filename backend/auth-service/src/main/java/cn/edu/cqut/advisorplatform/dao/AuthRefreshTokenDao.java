package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AuthRefreshTokenDao {
  AuthRefreshTokenDO save(AuthRefreshTokenDO token);

  Optional<AuthRefreshTokenDO> findByTokenHashAndRevokedFalse(@Param("tokenHash") String tokenHash);

  int revokeByUserId(@Param("userId") Long userId);
}
