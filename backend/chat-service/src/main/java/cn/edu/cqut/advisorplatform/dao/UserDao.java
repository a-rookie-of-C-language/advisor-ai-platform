package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserDao {
  Optional<UserDO> findById(@Param("id") Long id);

  Optional<UserDO> findByUsername(@Param("username") String username);
}
