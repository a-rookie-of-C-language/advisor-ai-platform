package cn.edu.cqut.advisorplatform.checkin.service;

import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.time.LocalDate;
import java.util.List;

public interface CheckInService {

  /** 统计学生的打卡记录 */
  PageResultVO<CheckInRecordVO> listCheckInRecords(
      UserPrincipal userPrincipal,
      Long studentId,
      LocalDate begin,
      LocalDate end,
      Integer page,
      Integer pageSize);

  List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(List<Long> studentIds);

  StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, Integer limit);

  /** 学生打卡 */
  String studentCheckIn(Long studentId);
}
