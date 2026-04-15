package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatSessionDao extends JpaRepository<ChatSessionDO, Long> {

    List<ChatSessionDO> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
