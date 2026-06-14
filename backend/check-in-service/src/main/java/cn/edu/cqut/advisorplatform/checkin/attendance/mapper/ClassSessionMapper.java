package cn.edu.cqut.advisorplatform.checkin.attendance.mapper;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.ClassSession;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ClassSessionMapper {
  int insert(ClassSession session);

  ClassSession selectById(@Param("id") Long id);

  List<ClassSession> selectSessions(
      @Param("term") String term, @Param("classCode") String classCode);

  int updateScheduleTime(
      @Param("id") Long id,
      @Param("sessionDate") LocalDate sessionDate,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime,
      @Param("location") String location);
}
