package cn.edu.cqut.advisorplatform.memoryservice.mapper;

import cn.edu.cqut.advisorplatform.memoryservice.entity.UserDO;
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

  List<UserDO> selectByUsernameContaining(@Param("username") String username);

  List<UserDO> selectAll();

  List<UserDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  boolean existsByUsername(@Param("username") String username);
}
