package cn.edu.cqut.advisorplatform.checkin.dao;

import cn.edu.cqut.advisorplatform.checkin.mapper.CheckInExceptionMapper;
import cn.edu.cqut.advisorplatform.checkin.mapper.StudentCheckInRecordMapper;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInException;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CheckInDao {
  private static final int MAX_EXPORT_LIMIT = 10000;

  private final StudentCheckInRecordMapper mapper;
  private final CheckInExceptionMapper exceptionMapper;

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
    return mapper.countCheckInRecords(studentId, checkInId, teacherUserId, begin, end, null);
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

  // 异常处理
  public CheckInException findExceptionById(Long id) {
    return exceptionMapper.selectExceptionById(id);
  }

  public int updateException(Long id, String status, Long handlerId, String handlerNote) {
    return exceptionMapper.updateException(id, status, handlerId, handlerNote);
  }

  public List<CheckInException> findExceptions(
      Long studentId, String checkInId, String status, Long handlerId) {
    return exceptionMapper.selectExceptions(studentId, checkInId, status, handlerId);
  }

  // 统计查询
  public long countRecordsByTeacher(Long teacherUserId, LocalDate begin, LocalDate end) {
    return mapper.countCheckInRecords(null, null, teacherUserId, begin, end, null);
  }

  public long countRecordsByStatus(
      Long teacherUserId, String status, LocalDate begin, LocalDate end) {
    return mapper.countCheckInRecords(null, null, teacherUserId, begin, end, status);
  }

  public List<Map<String, Object>> getClassAttendanceStatistics(
      Long teacherUserId, LocalDate begin, LocalDate end) {
    return mapper.selectClassAttendanceStatistics(teacherUserId, begin, end);
  }

  public List<CheckInRecordVO> selectRecordsForExport(
      Long studentId, String checkInId, Long teacherUserId, LocalDate begin, LocalDate end) {
    return mapper.selectCheckInRecords(
        studentId, checkInId, teacherUserId, begin, end, MAX_EXPORT_LIMIT, 0);
  }

  public int updateRecordStatus(String checkInId, Long studentId, String status) {
    return mapper.updateRecordStatus(checkInId, studentId, status);
  }
}
