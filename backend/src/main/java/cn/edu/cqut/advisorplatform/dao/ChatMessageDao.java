package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageDao extends JpaRepository<ChatMessageDO, Long> {

    List<ChatMessageDO> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    boolean existsBySessionIdAndTurnIdAndRole(Long sessionId, String turnId, String role);
}
