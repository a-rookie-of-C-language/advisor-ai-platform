package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ChatSessionDao {
  ChatSessionDO save(ChatSessionDO session);

  Optional<ChatSessionDO> findById(@Param("id") Long id);
}
