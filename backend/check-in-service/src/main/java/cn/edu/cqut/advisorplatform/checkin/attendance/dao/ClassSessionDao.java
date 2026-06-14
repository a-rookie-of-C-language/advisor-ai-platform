package cn.edu.cqut.advisorplatform.checkin.attendance.dao;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.ClassSession;
import cn.edu.cqut.advisorplatform.checkin.attendance.mapper.ClassSessionMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ClassSessionDao {
  private final ClassSessionMapper mapper;

  public int insert(ClassSession session) {
    return mapper.insert(session);
  }

  public ClassSession findById(Long id) {
    return mapper.selectById(id);
  }

  public List<ClassSession> findSessions(String term, String classCode) {
    return mapper.selectSessions(term, classCode);
  }

  public int updateScheduleTime(
      Long id,
      LocalDate sessionDate,
      LocalDateTime startTime,
      LocalDateTime endTime,
      String location) {
    return mapper.updateScheduleTime(id, sessionDate, startTime, endTime, location);
  }
}
