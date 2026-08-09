package cn.edu.cqut.advisorplatform.checkin.service.impl.checkin;

import cn.edu.cqut.advisorplatform.checkin.client.dto.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
class CheckInEntityFactory {

  CheckInActivity createActivity(
      String checkInId,
      Long teacherUserId,
      String teacherNo,
      CourseTeachingClassResponse teaching,
      CreateCheckInActivityRequest request,
      String title,
      String status,
      LocalDateTime now) {
    CheckInActivity activity = new CheckInActivity();
    activity.setCheckInId(checkInId);
    activity.setCourseId(request.getCourseId());
    activity.setCourseName(teaching.getCourseName());
    activity.setTitle(title);
    activity.setTeacherUserId(teacherUserId);
    activity.setTeacherNo(teacherNo);
    activity.setStartTime(request.getStartTime());
    activity.setEndTime(request.getEndTime());
    activity.setStatus(status);
    activity.setLateThresholdMinutes(request.getLateThresholdMinutes());
    activity.setCreatedAt(now);
    activity.setUpdatedAt(now);
    return activity;
  }

  StudentCheckInRecord createRecord(
      StudentClassResponse student, String checkInId, LocalDateTime now, String status) {
    StudentCheckInRecord record = new StudentCheckInRecord();
    record.setStudentId(student.getStudentId());
    record.setCheckInId(checkInId);
    record.setClassCode(student.getClassCode());
    record.setCheckDate(now.toLocalDate());
    record.setCheckedIn(true);
    record.setStatus(status);
    record.setCheckTime(now);
    return record;
  }
}
