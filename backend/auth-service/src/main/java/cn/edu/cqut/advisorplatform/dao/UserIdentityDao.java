package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.UserIdentityDO;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserIdentityDao extends JpaRepository<UserIdentityDO, Long> {
  Optional<UserIdentityDO> findByUserIdAndIdentityType(Long userId, String identityType);
}
