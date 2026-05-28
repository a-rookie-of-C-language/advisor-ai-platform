package cn.edu.cqut.advisorplatform.checkin.mapper;

import cn.edu.cqut.advisorplatform.checkin.annotation.AutoFill;
import cn.edu.cqut.advisorplatform.checkin.enums.OperationType;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface StudentCheckInRecordMapper {

  List<CheckInRecordVO> selectCheckInRecords(
      @Param("studentId") Long studentId,
      @Param("checkInId") String checkInId,
      @Param("teacherUserId") Long teacherUserId,
      @Param("beginDate") LocalDate begin,
      @Param("endDate") LocalDate end,
      @Param("pageSize") Integer pageSize,
      @Param("offset") int offset);

  Long countCheckInRecords(
      @Param("studentId") Long studentId,
      @Param("checkInId") String checkInId,
      @Param("teacherUserId") Long teacherUserId,
      @Param("beginDate") LocalDate begin,
      @Param("endDate") LocalDate end);

  List<StudentCheckInSummaryResponse> selectCheckInSummaries(
      @Param("studentIds") List<Long> studentIds);

  Boolean ifStudentCheckIn(StudentCheckInRecord dto);

  Boolean existsCheckInRecord(
      @Param("checkInId") String checkInId, @Param("studentId") Long studentId);

  @AutoFill(value = OperationType.INSERT)
  int studentCheckIn(StudentCheckInRecord dto);

  int insertCheckInActivity(CheckInActivity activity);

  int insertCheckInActivityClass(
      @Param("checkInId") String checkInId, @Param("classCode") String classCode);

  CheckInActivity selectActivityByCheckInId(@Param("checkInId") String checkInId);

  List<String> selectActivityClassCodes(@Param("checkInId") String checkInId);

  List<AvailableCheckInActivityVO> selectAvailableActivities(
      @Param("classCode") String classCode,
      @Param("studentId") Long studentId,
      @Param("now") LocalDateTime now);

  List<CheckInRecordVO> selectCheckInRecordsByClass(
      @Param("classCode") String classCode,
      @Param("teacherUserId") Long teacherUserId,
      @Param("beginDate") LocalDate begin,
      @Param("endDate") LocalDate end);

  int updateRecordStatus(
      @Param("checkInId") String checkInId,
      @Param("studentId") Long studentId,
      @Param("status") String status);
}
