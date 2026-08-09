package cn.edu.cqut.advisorplatform.checkin.service.impl.checkin;

import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.constant.CheckInConstant;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.enums.AttendanceStatus;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDateTime;

class StudentCheckInProcessor {

  private static final String ACTIVE = "ACTIVE";

  private final CheckInDao checkInDao;
  private final CheckInServiceSupport checkInServiceSupport;
  private final CheckInEntityFactory entityFactory;

  StudentCheckInProcessor(
      CheckInDao checkInDao,
      CheckInServiceSupport checkInServiceSupport,
      CheckInEntityFactory entityFactory) {
    this.checkInDao = checkInDao;
    this.checkInServiceSupport = checkInServiceSupport;
    this.entityFactory = entityFactory;
  }

  String checkIn(UserPrincipal userPrincipal, String checkInId) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.STUDENT);
    StudentClassResponse student = checkInServiceSupport.requireCurrentStudent(userPrincipal);
    CheckInActivity activity = checkInDao.findActivity(checkInId);
    if (activity == null) {
      throw new BadRequestException("打卡活动不存在");
    }
    LocalDateTime now = LocalDateTime.now();
    if (!ACTIVE.equals(activity.getStatus())
        || now.isBefore(activity.getStartTime())
        || now.isAfter(activity.getEndTime())) {
      throw new BadRequestException("当前不在打卡时间范围内");
    }
    if (!checkInDao.findActivityClassCodes(checkInId).contains(student.getClassCode())) {
      throw new ForbiddenException("无权参与该班级打卡");
    }
    // 判断考勤状态
    String status = determineAttendanceStatus(now, activity);

    var record = entityFactory.createRecord(student, checkInId, now, status);
    int rows = checkInDao.insertRecord(record);
    return rows == 1 ? CheckInConstant.CHECK_IN_SUCCESS : CheckInConstant.ALREADY_CHECKED_IN;
  }

  private String determineAttendanceStatus(LocalDateTime checkTime, CheckInActivity activity) {
    int lateThresholdMinutes =
        activity.getLateThresholdMinutes() != null ? activity.getLateThresholdMinutes() : 15;

    LocalDateTime lateDeadline = activity.getStartTime().plusMinutes(lateThresholdMinutes);

    if (checkTime.isAfter(lateDeadline)) {
      return AttendanceStatus.LATE.getCode();
    }

    return AttendanceStatus.NORMAL.getCode();
  }
}
