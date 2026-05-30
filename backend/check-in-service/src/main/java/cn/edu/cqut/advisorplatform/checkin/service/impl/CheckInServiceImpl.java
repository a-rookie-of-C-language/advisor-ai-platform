package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.client.TeacherServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.enums.ExceptionStatus;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.HandleExceptionRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.CheckInExportRow;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInException;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import com.alibaba.excel.EasyExcel;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckInServiceImpl implements CheckInService {
  private final CheckInDao checkInDao;
  private final CheckInServiceSupport checkInServiceSupport;
  private final CheckInEntityFactory entityFactory;
  private final CheckInDetailResponseFactory detailResponseFactory;
  private final CheckInActivityCreator activityCreator;
  private final StudentCheckInProcessor studentCheckInProcessor;
  private final CheckInRecordQuerySupport recordQuerySupport;

  public CheckInServiceImpl(
      CheckInDao checkInDao,
      TeacherServiceClient teacherServiceClient,
      CheckInServiceSupport checkInServiceSupport,
      CheckInEntityFactory entityFactory,
      CheckInDetailResponseFactory detailResponseFactory) {
    this.checkInDao = checkInDao;
    this.checkInServiceSupport = checkInServiceSupport;
    this.entityFactory = entityFactory;
    this.detailResponseFactory = detailResponseFactory;
    this.activityCreator =
        new CheckInActivityCreator(
            checkInDao, teacherServiceClient, checkInServiceSupport, entityFactory);
    this.studentCheckInProcessor =
        new StudentCheckInProcessor(checkInDao, checkInServiceSupport, entityFactory);
    this.recordQuerySupport = new CheckInRecordQuerySupport(checkInDao, checkInServiceSupport);
  }

  @Override
  @Transactional
  public CheckInActivityVO createActivity(
      UserPrincipal userPrincipal, CreateCheckInActivityRequest request) {
    return activityCreator.create(userPrincipal, request);
  }

  @Override
  public List<AvailableCheckInActivityVO> listAvailableActivities(UserPrincipal userPrincipal) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.STUDENT);
    StudentClassResponse student = checkInServiceSupport.requireCurrentStudent(userPrincipal);
    return checkInDao.findAvailableActivities(
        student.getClassCode(), student.getStudentId(), LocalDateTime.now());
  }

  @Override
  public PageResultVO<CheckInRecordVO> listCheckInRecords(
      UserPrincipal userPrincipal,
      Long studentId,
      String checkInId,
      LocalDate begin,
      LocalDate end,
      Integer page,
      Integer pageSize) {
    return recordQuerySupport.listCheckInRecords(
        userPrincipal, studentId, checkInId, begin, end, page, pageSize);
  }

  @Override
  public List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(List<Long> studentIds) {
    return checkInDao.selectSummaries(studentIds);
  }

  @Override
  public StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, Integer limit) {
    if (studentId == null) {
      throw new BadRequestException("学生ID不能为空");
    }
    int normalizedLimit = limit == null || limit < 1 ? 10 : limit;
    StudentCheckInSummaryResponse summary =
        checkInDao.selectSummaries(List.of(studentId)).stream()
            .findFirst()
            .orElseThrow(() -> new BadRequestException("学生不存在"));
    List<CheckInRecordVO> records =
        checkInDao.selectRecords(studentId, null, null, null, null, normalizedLimit, 0);
    return detailResponseFactory.create(summary, records);
  }

  @Override
  @Transactional
  public String studentCheckIn(UserPrincipal userPrincipal, String checkInId) {
    return studentCheckInProcessor.checkIn(userPrincipal, checkInId);
  }

  @Override
  public String studentCheckIn(Long studentId) {
    throw new BadRequestException("请使用打卡ID进行打卡");
  }

  @Override
  @Transactional
  public CheckInException handleException(
      UserPrincipal userPrincipal, Long exceptionId, HandleExceptionRequest request) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.ADMIN);

    CheckInException exception = checkInDao.findExceptionById(exceptionId);
    if (exception == null) {
      throw new BadRequestException("异常记录不存在");
    }

    if (!ExceptionStatus.PENDING.getCode().equals(exception.getStatus())
        && !ExceptionStatus.PROCESSING.getCode().equals(exception.getStatus())) {
      throw new BadRequestException("当前状态不允许处理");
    }

    Long handlerId = checkInServiceSupport.resolveUserId(userPrincipal);
    checkInDao.updateException(
        exceptionId, request.getStatus(), handlerId, request.getHandlerNote());

    return checkInDao.findExceptionById(exceptionId);
  }

  @Override
  public List<CheckInException> listExceptions(
      UserPrincipal userPrincipal, Long studentId, String checkInId, String status) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.ADMIN);
    Long teacherUserId = checkInServiceSupport.resolveUserId(userPrincipal);
    return checkInDao.findExceptions(studentId, checkInId, status, teacherUserId);
  }

  @Override
  public Map<String, Object> getAttendanceStatistics(
      UserPrincipal userPrincipal, LocalDate begin, LocalDate end) {
    checkInServiceSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    Long teacherUserId =
        userPrincipal.getRole() == UserRole.ADMIN
            ? null
            : checkInServiceSupport.resolveUserId(userPrincipal);

    Map<String, Object> statistics = new HashMap<>();
    statistics.put("totalRecords", checkInDao.countRecordsByTeacher(teacherUserId, begin, end));
    statistics.put(
        "normalCount", checkInDao.countRecordsByStatus(teacherUserId, "NORMAL", begin, end));
    statistics.put("lateCount", checkInDao.countRecordsByStatus(teacherUserId, "LATE", begin, end));
    statistics.put(
        "absentCount", checkInDao.countRecordsByStatus(teacherUserId, "ABSENT", begin, end));
    statistics.put(
        "leaveCount", checkInDao.countRecordsByStatus(teacherUserId, "LEAVE", begin, end));

    long totalRecords = (long) statistics.get("totalRecords");
    long normalCount = (long) statistics.get("normalCount");
    long lateCount = (long) statistics.get("lateCount");

    // 正常出勤率（仅 NORMAL）
    double normalRate = totalRecords > 0 ? (double) normalCount / totalRecords * 100 : 0;
    statistics.put("normalRate", Math.round(normalRate * 100.0) / 100.0);

    // 综合出勤率（NORMAL + LATE，即实际到课率）
    double attendanceRate =
        totalRecords > 0 ? (double) (normalCount + lateCount) / totalRecords * 100 : 0;
    statistics.put("attendanceRate", Math.round(attendanceRate * 100.0) / 100.0);

    // 迟到率（LATE / 总数）
    double lateRate = totalRecords > 0 ? (double) lateCount / totalRecords * 100 : 0;
    statistics.put("lateRate", Math.round(lateRate * 100.0) / 100.0);

    return statistics;
  }

  @Override
  public List<Map<String, Object>> getClassAttendanceStatistics(
      UserPrincipal userPrincipal, LocalDate begin, LocalDate end) {
    checkInServiceSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    Long teacherUserId =
        userPrincipal.getRole() == UserRole.ADMIN
            ? null
            : checkInServiceSupport.resolveUserId(userPrincipal);
    return checkInDao.getClassAttendanceStatistics(teacherUserId, begin, end);
  }

  @Override
  public byte[] exportAttendanceRecords(
      UserPrincipal userPrincipal,
      Long studentId,
      String checkInId,
      LocalDate begin,
      LocalDate end) {
    checkInServiceSupport.requireAnyRole(userPrincipal, UserRole.ADMIN, UserRole.ADVISOR);
    Long teacherUserId =
        userPrincipal.getRole() == UserRole.ADMIN
            ? null
            : checkInServiceSupport.resolveUserId(userPrincipal);

    List<CheckInRecordVO> records =
        checkInDao.selectRecordsForExport(studentId, checkInId, teacherUserId, begin, end);

    List<CheckInExportRow> rows =
        records.stream()
            .map(
                r ->
                    CheckInExportRow.from(
                        r.getStudentNo(),
                        r.getStudentName(),
                        r.getClassCode(),
                        r.getActivityTitle(),
                        r.getCheckDate(),
                        r.getCheckedIn(),
                        r.getCheckTime()))
            .toList();

    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      EasyExcel.write(out, CheckInExportRow.class).sheet("考勤记录").doWrite(rows);
      return out.toByteArray();
    } catch (java.io.IOException e) {
      throw new BadRequestException("导出失败: " + e.getMessage());
    }
  }
}
