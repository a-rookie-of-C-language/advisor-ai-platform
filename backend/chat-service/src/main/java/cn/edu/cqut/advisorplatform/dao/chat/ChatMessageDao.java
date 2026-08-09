package cn.edu.cqut.advisorplatform.dao.chat;

import cn.edu.cqut.advisorplatform.entity.chat.ChatMessageDO;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageDao extends JpaRepository<ChatMessageDO, Long> {

  List<ChatMessageDO> findBySessionIdOrderByCreatedAtAscIdAsc(Long sessionId);

  boolean existsBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role);

  boolean existsBySessionIdAndRole(Long sessionId, String role);

  Optional<ChatMessageDO> findFirstBySessionIdAndTurnIdAndRole(
      Long sessionId, String turnId, String role);
}
