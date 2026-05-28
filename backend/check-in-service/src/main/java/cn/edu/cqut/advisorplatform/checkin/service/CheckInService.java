package cn.edu.cqut.advisorplatform.checkin.service;

import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInException;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface CheckInService {

  CheckInActivityVO createActivity(
      UserPrincipal userPrincipal, CreateCheckInActivityRequest request);

  List<AvailableCheckInActivityVO> listAvailableActivities(UserPrincipal userPrincipal);

  PageResultVO<CheckInRecordVO> listCheckInRecords(
      UserPrincipal userPrincipal,
      Long studentId,
      String checkInId,
      LocalDate begin,
      LocalDate end,
      Integer page,
      Integer pageSize);

  List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(List<Long> studentIds);

  StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, Integer limit);

  String studentCheckIn(UserPrincipal userPrincipal, String checkInId);

  String studentCheckIn(Long studentId);

  // 异常处理
  CheckInException handleException(
      UserPrincipal userPrincipal,
      Long exceptionId,
      String status,
      String handlerNote);

  List<CheckInException> listExceptions(
      UserPrincipal userPrincipal,
      Long studentId,
      String checkInId,
      String status);

  // 统计查询
  Map<String, Object> getAttendanceStatistics(
      UserPrincipal userPrincipal,
      LocalDate begin,
      LocalDate end);

  List<Map<String, Object>> getClassAttendanceStatistics(
      UserPrincipal userPrincipal,
      LocalDate begin,
      LocalDate end);

  // 导出
  byte[] exportAttendanceRecords(
      UserPrincipal userPrincipal,
      Long studentId,
      String checkInId,
      LocalDate begin,
      LocalDate end);
}
