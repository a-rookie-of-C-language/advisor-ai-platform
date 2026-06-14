package cn.edu.cqut.advisorplatform.checkin.attendance.mapper;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.SessionAttendance;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SessionAttendanceMapper {
  int insertDefault(SessionAttendance attendance);

  List<SessionAttendance> selectBySessionId(@Param("sessionId") Long sessionId);

  int updateStatus(
      @Param("sessionId") Long sessionId,
      @Param("studentId") Long studentId,
      @Param("status") String status,
      @Param("remark") String remark,
      @Param("recordedBy") Long recordedBy);
}
