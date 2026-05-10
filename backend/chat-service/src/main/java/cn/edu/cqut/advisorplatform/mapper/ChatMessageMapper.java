package cn.edu.cqut.advisorplatform.mapper;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Mapper
public interface ChatMessageMapper {

  void insert(ChatMessageDO message);

  void update(ChatMessageDO message);

  void delete(Long id);

  ChatMessageDO selectById(Long id);

  List<ChatMessageDO> selectBySessionId(@Param("sessionId") Long sessionId);

  List<ChatMessageDO> selectBySessionIdPageable(
      @Param("sessionId") Long sessionId,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countBySessionId(@Param("sessionId") Long sessionId);

  List<ChatMessageDO> selectByUserId(@Param("userId") Long userId);

  List<ChatMessageDO> selectBySessionIdAndRole(
      @Param("sessionId") Long sessionId,
      @Param("role") String role);

  List<ChatMessageDO> selectBySessionIdOrderByCreatedAt(
      @Param("sessionId") Long sessionId);

  default List<ChatMessageDO> selectBySessionIdOrderByCreatedAtAscIdAsc(Long sessionId) {
    return selectBySessionIdOrderByCreatedAt(sessionId);
  }

  default boolean existsBySessionIdAndRole(Long sessionId, String role) {
    return !selectBySessionIdAndRole(sessionId, role).isEmpty();
  }

  default boolean existsBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role) {
    return selectBySessionIdAndRole(sessionId, role).stream()
        .anyMatch(m -> turnId != null && turnId.equals(m.getTurnId()));
  }

  default ChatMessageDO selectFirstBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role) {
    return selectBySessionIdAndRole(sessionId, role).stream()
        .filter(m -> turnId != null && turnId.equals(m.getTurnId()))
        .findFirst()
        .orElse(null);
  }

  Optional<ChatMessageDO> selectLatestBySessionId(@Param("sessionId") Long sessionId);

  List<ChatMessageDO> selectBySessionIdAndDateRange(
      @Param("sessionId") Long sessionId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  int deleteBySessionId(@Param("sessionId") Long sessionId);
}
