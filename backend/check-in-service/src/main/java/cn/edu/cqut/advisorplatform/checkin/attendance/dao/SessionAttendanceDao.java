package cn.edu.cqut.advisorplatform.checkin.attendance.dao;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.SessionAttendance;
import cn.edu.cqut.advisorplatform.checkin.attendance.mapper.SessionAttendanceMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SessionAttendanceDao {
  private final SessionAttendanceMapper mapper;

  public int insertDefault(SessionAttendance attendance) {
    return mapper.insertDefault(attendance);
  }

  public List<SessionAttendance> findBySessionId(Long sessionId) {
    return mapper.selectBySessionId(sessionId);
  }

  public int updateStatus(
      Long sessionId, Long studentId, String status, String remark, Long recordedBy) {
    return mapper.updateStatus(sessionId, studentId, status, remark, recordedBy);
  }
}
