package cn.edu.cqut.advisorplatform.mapper;

import cn.edu.cqut.advisorplatform.entity.AuthRefreshTokenDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface AuthRefreshTokenMapper {

  void insert(AuthRefreshTokenDO token);

  void update(AuthRefreshTokenDO token);

  void delete(Long id);

  AuthRefreshTokenDO selectById(Long id);

  Optional<AuthRefreshTokenDO> selectByTokenHashAndNotRevokedAndNotExpired(
      @Param("tokenHash") String tokenHash, @Param("now") LocalDateTime now);

  List<AuthRefreshTokenDO> selectByUserIdAndNotRevokedAndNotExpired(
      @Param("userId") Long userId, @Param("now") LocalDateTime now);
}
