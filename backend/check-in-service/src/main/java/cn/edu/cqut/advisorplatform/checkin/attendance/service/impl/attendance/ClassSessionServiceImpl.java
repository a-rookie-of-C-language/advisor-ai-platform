package cn.edu.cqut.advisorplatform.checkin.attendance.service.impl.attendance;

import cn.edu.cqut.advisorplatform.checkin.attendance.dao.ClassSessionDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.AttendanceAccessSupport;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.ClassSessionService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.ClassSessionVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClassSessionServiceImpl implements ClassSessionService {
  private final ClassSessionDao classSessionDao;
  private final AttendanceAccessSupport accessSupport;
  private final AttendanceMapperSupport mapperSupport;

  @Override
  public List<ClassSessionVO> listSessions(
      UserPrincipal userPrincipal, String term, String classCode) {
    String scopedClassCode = classCode;
    if (userPrincipal.getRole() == UserRole.MONITOR) {
      scopedClassCode = accessSupport.requireMonitorClassCode(userPrincipal);
    } else {
      accessSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    }
    return classSessionDao.findSessions(term, scopedClassCode).stream()
        .map(mapperSupport::toSessionVO)
        .toList();
  }
}
