package cn.edu.cqut.advisorplatform.checkin.attendance.service;

import cn.edu.cqut.advisorplatform.checkin.attendance.dto.SessionAttendanceUpdateRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.SessionAttendanceVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.util.List;

public interface SessionAttendanceService {
  List<SessionAttendanceVO> getSessionAttendance(UserPrincipal userPrincipal, Long sessionId);

  List<SessionAttendanceVO> updateSessionAttendance(
      UserPrincipal userPrincipal, Long sessionId, SessionAttendanceUpdateRequest request);
}
