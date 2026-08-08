package cn.edu.cqut.advisorplatform.checkin.service.impl.checkin;

import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDate;
import java.util.List;

class CheckInRecordQuerySupport {

  private final CheckInDao checkInDao;
  private final CheckInServiceSupport checkInServiceSupport;

  CheckInRecordQuerySupport(CheckInDao checkInDao, CheckInServiceSupport checkInServiceSupport) {
    this.checkInDao = checkInDao;
    this.checkInServiceSupport = checkInServiceSupport;
  }

  PageResultVO<CheckInRecordVO> listCheckInRecords(
      UserPrincipal userPrincipal,
      Long studentId,
      String checkInId,
      LocalDate begin,
      LocalDate end,
      Integer page,
      Integer pageSize) {
    LocalDate[] range = checkInServiceSupport.normalizeDateRange(begin, end);
    int normalizedPage = page == null || page < 1 ? 1 : page;
    int normalizedPageSize = pageSize == null || pageSize < 10 ? 10 : pageSize;
    Long queryStudentId = studentId;
    Long teacherUserId = null;
    if (userPrincipal.getRole() == UserRole.STUDENT) {
      StudentClassResponse student = checkInServiceSupport.requireCurrentStudent(userPrincipal);
      queryStudentId = student.getStudentId();
    } else if (userPrincipal.getRole() == UserRole.TEACHER) {
      teacherUserId = userPrincipal.getId();
    }

    String normalizedCheckInId = checkInServiceSupport.blankToNull(checkInId);
    Long total =
        checkInDao.countRecords(
            queryStudentId, normalizedCheckInId, teacherUserId, range[0], range[1]);
    List<CheckInRecordVO> records =
        checkInDao.selectRecords(
            queryStudentId,
            normalizedCheckInId,
            teacherUserId,
            range[0],
            range[1],
            normalizedPageSize,
            (normalizedPage - 1) * normalizedPageSize);
    return new PageResultVO<>(total, records);
  }
}
