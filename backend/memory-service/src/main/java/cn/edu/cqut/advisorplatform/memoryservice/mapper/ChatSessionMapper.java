package cn.edu.cqut.advisorplatform.memoryservice.mapper;

import cn.edu.cqut.advisorplatform.memoryservice.entity.ChatSessionDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface ChatSessionMapper {

  void insert(ChatSessionDO session);

  void update(ChatSessionDO session);

  void delete(Long id);

  ChatSessionDO selectById(Long id);

  List<ChatSessionDO> selectByUserId(@Param("userId") Long userId);

  List<ChatSessionDO> selectByUserIdAndNotDeleted(
      @Param("userId") Long userId);

  List<ChatSessionDO> selectByUserIdPageable(
      @Param("userId") Long userId,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByUserId(@Param("userId") Long userId);

  int countByUserIdAndNotDeleted(@Param("userId") Long userId);

  List<ChatSessionDO> selectAll();

  void markDeleted(@Param("id") Long id);

  Optional<ChatSessionDO> selectLatestByUserId(@Param("userId") Long userId);
}
