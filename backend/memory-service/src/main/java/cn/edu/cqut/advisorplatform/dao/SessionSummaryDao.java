package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.SessionSummaryDO;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionSummaryDao extends JpaRepository<SessionSummaryDO, Long> {

  Optional<SessionSummaryDO> findBySessionId(Long sessionId);
}
