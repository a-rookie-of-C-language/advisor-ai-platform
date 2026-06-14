package cn.edu.cqut.advisorplatform.checkin.attendance.service;

import cn.edu.cqut.advisorplatform.checkin.attendance.vo.ClassSessionVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.util.List;

public interface ClassSessionService {
  List<ClassSessionVO> listSessions(UserPrincipal userPrincipal, String term, String classCode);
}
