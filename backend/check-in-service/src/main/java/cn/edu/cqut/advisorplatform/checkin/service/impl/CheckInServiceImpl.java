package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.client.TeacherServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.constant.CheckInConstant;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal.UserRole;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CheckInServiceImpl implements CheckInService {
  private static final String ACTIVE = "ACTIVE";

  private final CheckInDao checkInDao;
  private final TeacherServiceClient teacherServiceClient;
  private final CheckInServiceSupport checkInServiceSupport;

  @Override
  @Transactional
  public CheckInActivityVO createActivity(
      UserPrincipal userPrincipal, CreateCheckInActivityRequest request) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.TEACHER);
    checkInServiceSupport.validateActivityRequest(request);
    var identity = checkInServiceSupport.requireIdentity(userPrincipal.getId(), "TEACHER");
    CourseTeachingClassResponse teaching =
        teacherServiceClient.getTeachingClasses(identity.getIdentityNo(), request.getCourseId());
    Set<String> requestedClassCodes =
        checkInServiceSupport.normalizeClassCodes(request.getClassCodes());
    if (!new java.util.LinkedHashSet<>(teaching.getClassCodes()).containsAll(requestedClassCodes)) {
      throw new ForbiddenException("鍙兘涓烘湰浜烘巿璇剧彮绾у彂璧锋墦鍗?");
    }

    String checkInId = UUID.randomUUID().toString();
    LocalDateTime now = LocalDateTime.now();
    CheckInActivity activity = new CheckInActivity();
    activity.setCheckInId(checkInId);
    activity.setCourseId(request.getCourseId());
    activity.setCourseName(teaching.getCourseName());
    activity.setTitle(
        checkInServiceSupport.resolveTitle(request.getTitle(), teaching.getCourseName()));
    activity.setTeacherUserId(userPrincipal.getId());
    activity.setTeacherNo(identity.getIdentityNo());
    activity.setStartTime(request.getStartTime());
    activity.setEndTime(request.getEndTime());
    activity.setStatus(ACTIVE);
    activity.setCreatedAt(now);
    activity.setUpdatedAt(now);
    checkInDao.insertActivity(activity);
    requestedClassCodes.forEach(classCode -> checkInDao.insertActivityClass(checkInId, classCode));
    return checkInServiceSupport.toActivityVO(activity, List.copyOf(requestedClassCodes));
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
    Long total =
        checkInDao.countRecords(
            queryStudentId,
            checkInServiceSupport.blankToNull(checkInId),
            teacherUserId,
            range[0],
            range[1]);
    List<CheckInRecordVO> records =
        checkInDao.selectRecords(
            queryStudentId,
            checkInServiceSupport.blankToNull(checkInId),
            teacherUserId,
            range[0],
            range[1],
            normalizedPageSize,
            (normalizedPage - 1) * normalizedPageSize);
    return new PageResultVO<>(total, records);
  }

  @Override
  public List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(List<Long> studentIds) {
    return checkInDao.selectSummaries(studentIds);
  }

  @Override
  public StudentCheckInDetailResponse getStudentCheckInDetail(Long studentId, Integer limit) {
    if (studentId == null) {
      throw new BadRequestException("瀛︾敓ID涓嶈兘涓虹┖");
    }
    int normalizedLimit = limit == null || limit < 1 ? 10 : limit;
    StudentCheckInSummaryResponse summary =
        checkInDao.selectSummaries(List.of(studentId)).stream()
            .findFirst()
            .orElseThrow(() -> new BadRequestException("瀛︾敓涓嶅瓨鍦?"));
    List<CheckInRecordVO> records =
        checkInDao.selectRecords(
            studentId,
            null,
            null,
            LocalDate.now().minusDays(3650),
            LocalDate.now(),
            normalizedLimit,
            0);
    StudentCheckInDetailResponse response = new StudentCheckInDetailResponse();
    response.setSummary(summary);
    response.setRecentRecords(records.stream().map(checkInServiceSupport::toRecordItem).toList());
    return response;
  }

  @Override
  @Transactional
  public String studentCheckIn(UserPrincipal userPrincipal, String checkInId) {
    checkInServiceSupport.requireRole(userPrincipal, UserRole.STUDENT);
    StudentClassResponse student = checkInServiceSupport.requireCurrentStudent(userPrincipal);
    CheckInActivity activity = checkInDao.findActivity(checkInId);
    if (activity == null) {
      throw new BadRequestException("鎵撳崱娲诲姩涓嶅瓨鍦?");
    }
    LocalDateTime now = LocalDateTime.now();
    if (!ACTIVE.equals(activity.getStatus())
        || now.isBefore(activity.getStartTime())
        || now.isAfter(activity.getEndTime())) {
      throw new BadRequestException("褰撳墠鎵撳崱宸茬粨鏉?");
    }
    if (!checkInDao.findActivityClassCodes(checkInId).contains(student.getClassCode())) {
      throw new ForbiddenException("鏃犳潈鍙備笌璇ョ彮绾ф墦鍗?");
    }
    if (checkInDao.existsRecord(checkInId, student.getStudentId())) {
      return CheckInConstant.ALREADY_CHECKED_IN;
    }
    StudentCheckInRecord record = new StudentCheckInRecord();
    record.setStudentId(student.getStudentId());
    record.setCheckInId(checkInId);
    record.setClassCode(student.getClassCode());
    record.setCheckDate(now.toLocalDate());
    record.setCheckedIn(true);
    record.setCheckTime(now);
    int rows = checkInDao.insertRecord(record);
    return rows == 1 ? CheckInConstant.CHECK_IN_SUCCESS : CheckInConstant.ALREADY_CHECKED_IN;
  }

  @Override
  public String studentCheckIn(Long studentId) {
    throw new BadRequestException("璇蜂娇鐢ㄦ墦鍗D杩涜鎵撳崱");
  }
}
