package cn.edu.cqut.advisorplatform.memoryservice.dao;

import cn.edu.cqut.advisorplatform.memoryservice.entity.SessionSummaryDO;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SessionSummaryDao {
  SessionSummaryDO save(SessionSummaryDO summary);

  Optional<SessionSummaryDO> findBySessionId(@Param("sessionId") Long sessionId);
}
