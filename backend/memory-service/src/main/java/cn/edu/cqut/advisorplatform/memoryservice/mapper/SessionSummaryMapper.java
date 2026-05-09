package cn.edu.cqut.advisorplatform.memoryservice.mapper;

import cn.edu.cqut.advisorplatform.memoryservice.entity.SessionSummaryDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface SessionSummaryMapper {

  void insert(SessionSummaryDO summary);

  void update(SessionSummaryDO summary);

  void delete(Long id);

  SessionSummaryDO selectById(Long id);

  Optional<SessionSummaryDO> selectBySessionId(@Param("sessionId") Long sessionId);

  List<SessionSummaryDO> selectByUserId(@Param("userId") Long userId);

  List<SessionSummaryDO> selectByUserIdPageable(
      @Param("userId") Long userId,
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countByUserId(@Param("userId") Long userId);

  List<SessionSummaryDO> selectAll();

  List<SessionSummaryDO> selectPage(
      @Param("offset") int offset,
      @Param("limit") int limit);

  int countAll();

  Optional<SessionSummaryDO> selectLatestByUserId(@Param("userId") Long userId);

  int deleteBySessionId(@Param("sessionId") Long sessionId);
}
