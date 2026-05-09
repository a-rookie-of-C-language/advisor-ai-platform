package cn.edu.cqut.advisorplatform.memoryservice.dao;

import cn.edu.cqut.advisorplatform.memoryservice.entity.ChatSessionDO;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ChatSessionDao {
  Optional<ChatSessionDO> findById(@Param("id") Long id);

  List<ChatSessionDO> findByUserIdOrderByUpdatedAtDesc(@Param("userId") Long userId);
}
