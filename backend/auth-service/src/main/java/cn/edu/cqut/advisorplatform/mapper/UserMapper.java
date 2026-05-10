package cn.edu.cqut.advisorplatform.mapper;

import cn.edu.cqut.advisorplatform.entity.UserDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {

  void insert(UserDO user);

  void update(UserDO user);

  void delete(Long id);

  UserDO selectById(Long id);

  Optional<UserDO> selectByUsername(@Param("username") String username);

  boolean existsByUsername(@Param("username") String username);

  List<UserDO> selectAll();
}
