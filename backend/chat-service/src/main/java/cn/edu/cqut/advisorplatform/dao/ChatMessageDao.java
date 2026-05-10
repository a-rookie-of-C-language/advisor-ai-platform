package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ChatMessageDao {
  ChatMessageDO save(ChatMessageDO message);

  boolean existsBySessionIdAndTurnIdAndRole(
      @Param("sessionId") Long sessionId, @Param("turnId") String turnId, @Param("role") String role);

  boolean existsBySessionIdAndRole(@Param("sessionId") Long sessionId, @Param("role") String role);

  Optional<ChatMessageDO> findFirstBySessionIdAndTurnIdAndRole(
      @Param("sessionId") Long sessionId, @Param("turnId") String turnId, @Param("role") String role);
}
