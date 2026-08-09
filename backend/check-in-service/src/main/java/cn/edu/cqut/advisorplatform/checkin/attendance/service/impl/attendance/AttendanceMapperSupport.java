package cn.edu.cqut.advisorplatform.checkin.attendance.service.impl.attendance;

import cn.edu.cqut.advisorplatform.checkin.attendance.entity.AttendanceWorkOrder;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.ClassSession;
import cn.edu.cqut.advisorplatform.checkin.attendance.entity.SessionAttendance;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.AttendanceWorkOrderVO;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.ClassSessionVO;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.SessionAttendanceVO;
import org.springframework.stereotype.Component;

@Component
class AttendanceMapperSupport {
  ClassSessionVO toSessionVO(ClassSession session) {
    ClassSessionVO vo = new ClassSessionVO();
    vo.setId(session.getId());
    vo.setTerm(session.getTerm());
    vo.setClassCode(session.getClassCode());
    vo.setCourseCode(session.getCourseCode());
    vo.setCourseName(session.getCourseName());
    vo.setTeacherName(session.getTeacherName());
    vo.setWeekNo(session.getWeekNo());
    vo.setWeekday(session.getWeekday());
    vo.setPeriodStart(session.getPeriodStart());
    vo.setPeriodEnd(session.getPeriodEnd());
    vo.setSessionDate(session.getSessionDate());
    vo.setStartTime(session.getStartTime());
    vo.setEndTime(session.getEndTime());
    vo.setLocation(session.getLocation());
    vo.setStatus(session.getStatus());
    return vo;
  }

  SessionAttendanceVO toAttendanceVO(SessionAttendance attendance) {
    SessionAttendanceVO vo = new SessionAttendanceVO();
    vo.setId(attendance.getId());
    vo.setSessionId(attendance.getSessionId());
    vo.setStudentId(attendance.getStudentId());
    vo.setStudentNo(attendance.getStudentNo());
    vo.setStudentName(attendance.getStudentName());
    vo.setClassCode(attendance.getClassCode());
    vo.setStatus(attendance.getStatus());
    vo.setRemark(attendance.getRemark());
    vo.setRecordedAt(attendance.getRecordedAt());
    return vo;
  }

  AttendanceWorkOrderVO toWorkOrderVO(AttendanceWorkOrder workOrder) {
    AttendanceWorkOrderVO vo = new AttendanceWorkOrderVO();
    vo.setId(workOrder.getId());
    vo.setSessionId(workOrder.getSessionId());
    vo.setClassCode(workOrder.getClassCode());
    vo.setType(workOrder.getType());
    vo.setStatus(workOrder.getStatus());
    vo.setReason(workOrder.getReason());
    vo.setTargetSessionDate(workOrder.getTargetSessionDate());
    vo.setTargetStartTime(workOrder.getTargetStartTime());
    vo.setTargetEndTime(workOrder.getTargetEndTime());
    vo.setTargetLocation(workOrder.getTargetLocation());
    vo.setApplicantId(workOrder.getApplicantId());
    vo.setReviewerId(workOrder.getReviewerId());
    vo.setReviewNote(workOrder.getReviewNote());
    vo.setReviewedAt(workOrder.getReviewedAt());
    vo.setCreatedAt(workOrder.getCreatedAt());
    return vo;
  }
}
