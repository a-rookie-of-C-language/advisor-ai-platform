package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionDao extends JpaRepository<ChatSessionDO, Long> {

  List<ChatSessionDO> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
