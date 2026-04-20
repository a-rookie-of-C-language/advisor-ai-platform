package cn.edu.cqut.advisorplatform.dao;

import cn.edu.cqut.advisorplatform.entity.SessionSummaryDO;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SessionSummaryDao extends JpaRepository<SessionSummaryDO, Long> {

    Optional<SessionSummaryDO> findBySessionId(Long sessionId);
}
