package cn.edu.cqut.advisorplatform.checkin.attendance.service.impl;

import cn.edu.cqut.advisorplatform.checkin.attendance.dao.ClassSessionDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.dao.SessionAttendanceDao;
import cn.edu.cqut.advisorplatform.checkin.attendance.dto.SessionAttendanceUpdateRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.ClassSession;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.SessionAttendance;
import cn.edu.cqut.advisorplatform.checkin.attendance.enums.SessionAttendanceStatus;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.AttendanceAccessSupport;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.SessionAttendanceService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.SessionAttendanceVO;
import cn.edu.cqut.advisorplatform.checkin.client.StudentServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.ClassStudentResponse;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SessionAttendanceServiceImpl implements SessionAttendanceService {
  private final ClassSessionDao classSessionDao;
  private final SessionAttendanceDao sessionAttendanceDao;
  private final StudentServiceClient studentServiceClient;
  private final AttendanceAccessSupport accessSupport;
  private final AttendanceMapperSupport mapperSupport;

  @Override
  @Transactional
  public List<SessionAttendanceVO> getSessionAttendance(
      UserPrincipal userPrincipal, Long sessionId) {
    ClassSession session = requireSession(sessionId);
    ensureAccess(userPrincipal, session);
    ensureDefaultAttendance(session);
    return sessionAttendanceDao.findBySessionId(sessionId).stream()
        .map(mapperSupport::toAttendanceVO)
        .toList();
  }

  @Override
  @Transactional
  public List<SessionAttendanceVO> updateSessionAttendance(
      UserPrincipal userPrincipal, Long sessionId, SessionAttendanceUpdateRequest request) {
    ClassSession session = requireSession(sessionId);
    ensureAccess(userPrincipal, session);
    ensureDefaultAttendance(session);
    Long recordedBy = accessSupport.requireUserId(userPrincipal);
    if (request != null && request.getMarks() != null) {
      request
          .getMarks()
          .forEach(
              mark -> {
                String status = normalizeStatus(mark.getStatus());
                sessionAttendanceDao.updateStatus(
                    sessionId, mark.getStudentId(), status, mark.getRemark(), recordedBy);
              });
    }
    return sessionAttendanceDao.findBySessionId(sessionId).stream()
        .map(mapperSupport::toAttendanceVO)
        .toList();
  }

  private void ensureAccess(UserPrincipal userPrincipal, ClassSession session) {
    if (userPrincipal.getRole() == UserRole.MONITOR) {
      String classCode = accessSupport.requireMonitorClassCode(userPrincipal);
      accessSupport.requireSameClass(classCode, session.getClassCode());
      return;
    }
    accessSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
  }

  private void ensureDefaultAttendance(ClassSession session) {
    List<ClassStudentResponse> students =
        studentServiceClient.listClassStudents(session.getClassCode());
    LocalDateTime now = LocalDateTime.now();
    for (ClassStudentResponse student : students) {
      SessionAttendance attendance = new SessionAttendance();
      attendance.setSessionId(session.getId());
      attendance.setStudentId(student.getStudentId());
      attendance.setStudentNo(student.getStudentNo());
      attendance.setStudentName(student.getStudentName());
      attendance.setClassCode(session.getClassCode());
      attendance.setStatus(SessionAttendanceStatus.PRESENT.name());
      attendance.setCreatedAt(now);
      attendance.setUpdatedAt(now);
      sessionAttendanceDao.insertDefault(attendance);
    }
  }

  private ClassSession requireSession(Long sessionId) {
    if (sessionId == null) {
      throw new BadRequestException("课堂ID不能为空");
    }
    ClassSession session = classSessionDao.findById(sessionId);
    if (session == null) {
      throw new BadRequestException("课堂不存在");
    }
    return session;
  }

  private String normalizeStatus(String status) {
    if (status == null || status.isBlank()) {
      return SessionAttendanceStatus.PRESENT.name();
    }
    try {
      return SessionAttendanceStatus.valueOf(status.trim().toUpperCase()).name();
    } catch (IllegalArgumentException e) {
      throw new BadRequestException("考勤状态不合法");
    }
  }
}
