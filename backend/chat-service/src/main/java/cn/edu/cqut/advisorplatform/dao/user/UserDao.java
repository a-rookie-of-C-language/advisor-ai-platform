package cn.edu.cqut.advisorplatform.dao.user;

import cn.edu.cqut.advisorplatform.entity.user.UserDO;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserDao extends JpaRepository<UserDO, Long> {

  Optional<UserDO> findByUsername(String username);

  boolean existsByUsername(String username);
}
