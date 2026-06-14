package cn.edu.cqut.advisorplatform.checkin.attendance.service;

import cn.edu.cqut.advisorplatform.checkin.attendance.vo.CourseScheduleImportResultVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

public interface CourseScheduleService {
  CourseScheduleImportResultVO importSchedules(UserPrincipal userPrincipal, MultipartFile file);
}
