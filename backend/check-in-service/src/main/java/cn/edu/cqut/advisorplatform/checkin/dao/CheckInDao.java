package cn.edu.cqut.advisorplatform.checkin.dao;

import cn.edu.cqut.advisorplatform.checkin.mapper.StudentCheckInRecordMapper;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CheckInDao {
  private final StudentCheckInRecordMapper mapper;

  public List<CheckInRecordVO> selectRecords(
      Long studentId,
      String checkInId,
      Long teacherUserId,
      LocalDate begin,
      LocalDate end,
      Integer pageSize,
      int offset) {
    return mapper.selectCheckInRecords(
        studentId, checkInId, teacherUserId, begin, end, pageSize, offset);
  }

  public Long countRecords(
      Long studentId, String checkInId, Long teacherUserId, LocalDate begin, LocalDate end) {
    return mapper.countCheckInRecords(studentId, checkInId, teacherUserId, begin, end);
  }

  public List<StudentCheckInSummaryResponse> selectSummaries(List<Long> studentIds) {
    return mapper.selectCheckInSummaries(studentIds);
  }

  public boolean existsRecord(String checkInId, Long studentId) {
    return Boolean.TRUE.equals(mapper.existsCheckInRecord(checkInId, studentId));
  }

  public int insertRecord(StudentCheckInRecord record) {
    return mapper.studentCheckIn(record);
  }

  public int insertActivity(CheckInActivity activity) {
    return mapper.insertCheckInActivity(activity);
  }

  public int insertActivityClass(String checkInId, String classCode) {
    return mapper.insertCheckInActivityClass(checkInId, classCode);
  }

  public CheckInActivity findActivity(String checkInId) {
    return mapper.selectActivityByCheckInId(checkInId);
  }

  public List<String> findActivityClassCodes(String checkInId) {
    return mapper.selectActivityClassCodes(checkInId);
  }

  public List<AvailableCheckInActivityVO> findAvailableActivities(
      String classCode, Long studentId, LocalDateTime now) {
    return mapper.selectAvailableActivities(classCode, studentId, now);
  }
}
