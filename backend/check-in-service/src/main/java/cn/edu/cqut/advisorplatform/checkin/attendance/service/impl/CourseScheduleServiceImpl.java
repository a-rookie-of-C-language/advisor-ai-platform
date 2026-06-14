package cn.edu.cqut.advisorplatform.checkin.attendance.service.impl;

import cn.edu.cqut.advisorplatform.checkin.attendance.dao.ClassSessionDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.dao.CourseScheduleDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.dto.CourseScheduleImportRow;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.ClassSession;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.CourseSchedule;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.AttendanceAccessSupport;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.CourseScheduleService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.CourseScheduleImportResultVO;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import com.alibaba.excel.EasyExcel;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class CourseScheduleServiceImpl implements CourseScheduleService {
  private static final String SESSION_SCHEDULED = "SCHEDULED";

  private final CourseScheduleDao courseScheduleDao;
  private final ClassSessionDao classSessionDao;
  private final AttendanceAccessSupport accessSupport;
  private final CourseScheduleImportParser parser = new CourseScheduleImportParser();

  @Override
  @Transactional
  public CourseScheduleImportResultVO importSchedules(
      UserPrincipal userPrincipal, MultipartFile file) {
    accessSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("课表文件不能为空");
    }
    List<CourseScheduleImportRow> rows = readRows(file);
    int scheduleCount = 0;
    int sessionCount = 0;
    for (CourseScheduleImportRow row : rows) {
      parser.validate(row);
      CourseSchedule schedule = buildSchedule(row, accessSupport.requireUserId(userPrincipal));
      courseScheduleDao.insert(schedule);
      scheduleCount++;
      for (int weekNo = schedule.getWeekStart(); weekNo <= schedule.getWeekEnd(); weekNo++) {
        classSessionDao.insert(buildSession(schedule, weekNo));
        sessionCount++;
      }
    }
    return new CourseScheduleImportResultVO(scheduleCount, sessionCount);
  }

  private List<CourseScheduleImportRow> readRows(MultipartFile file) {
    try {
      return EasyExcel.read(file.getInputStream())
          .head(CourseScheduleImportRow.class)
          .sheet()
          .doReadSync();
    } catch (IOException e) {
      throw new BadRequestException("课表文件读取失败: " + e.getMessage());
    }
  }

  private CourseSchedule buildSchedule(CourseScheduleImportRow row, Long userId) {
    int[] weeks = parser.parseWeekRange(row);
    int[] periods = parser.parsePeriodRange(row);
    LocalDateTime now = LocalDateTime.now();
    CourseSchedule schedule = new CourseSchedule();
    schedule.setTerm(parser.trim(row.getTerm()));
    schedule.setClassCode(parser.trim(row.getClassCode()));
    schedule.setCourseCode(parser.trim(row.getCourseCode()));
    schedule.setCourseName(parser.trim(row.getCourseName()));
    schedule.setTeacherNo(parser.trim(row.getTeacherNo()));
    schedule.setTeacherName(parser.trim(row.getTeacherName()));
    schedule.setWeekStart(weeks[0]);
    schedule.setWeekEnd(weeks[1]);
    schedule.setWeekday(row.getWeekday());
    schedule.setPeriodStart(periods[0]);
    schedule.setPeriodEnd(periods[1]);
    schedule.setLocation(parser.trim(row.getLocation()));
    schedule.setCreatedBy(userId);
    schedule.setCreatedAt(now);
    schedule.setUpdatedAt(now);
    return schedule;
  }

  private ClassSession buildSession(CourseSchedule schedule, int weekNo) {
    LocalDateTime now = LocalDateTime.now();
    ClassSession session = new ClassSession();
    session.setScheduleId(schedule.getId());
    session.setTerm(schedule.getTerm());
    session.setClassCode(schedule.getClassCode());
    session.setCourseCode(schedule.getCourseCode());
    session.setCourseName(schedule.getCourseName());
    session.setTeacherNo(schedule.getTeacherNo());
    session.setTeacherName(schedule.getTeacherName());
    session.setWeekNo(weekNo);
    session.setWeekday(schedule.getWeekday());
    session.setPeriodStart(schedule.getPeriodStart());
    session.setPeriodEnd(schedule.getPeriodEnd());
    session.setLocation(schedule.getLocation());
    session.setStatus(SESSION_SCHEDULED);
    session.setCreatedAt(now);
    session.setUpdatedAt(now);
    return session;
  }
}
