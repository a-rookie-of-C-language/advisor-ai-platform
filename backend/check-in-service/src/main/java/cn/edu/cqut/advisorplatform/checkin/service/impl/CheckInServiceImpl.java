package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.client.AuthServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.StudentServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.TeacherServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.UserIdentityResponse;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CheckInServiceImpl implements CheckInService {
  private static final String IDENTITY_STUDENT = "STUDENT";
  private static final String IDENTITY_TEACHER = "TEACHER";
  private static final String ACTIVE = "ACTIVE";

  private final CheckInDao checkInDao;
  private final AuthServiceClient authServiceClient;
  private final StudentServiceClient studentServiceClient;
  private final TeacherServiceClient teacherServiceClient;

  @Override
  @Transactional
  public CheckInActivityVO createActivity(
      UserPrincipal userPrincipal, CreateCheckInActivityRequest request) {
    requireRole(userPrincipal, UserRole.TEACHER);
    validateActivityRequest(request);
    UserIdentityResponse identity = requireIdentity(userPrincipal.getId(), IDENTITY_TEACHER);
    CourseTeachingClassResponse teaching =
        teacherServiceClient.getTeachingClasses(identity.getIdentityNo(), request.getCourseId());
    Set<String> requestedClassCodes = normalizeClassCodes(request.getClassCodes());
    if (!new LinkedHashSet<>(teaching.getClassCodes()).containsAll(requestedClassCodes)) {
      throw new ForbiddenException("只能为本人授课班级发起打卡");
    }

    String checkInId = UUID.randomUUID().toString();
    LocalDateTime now = LocalDateTime.now();
    CheckInActivity activity = new CheckInActivity();
    activity.setCheckInId(checkInId);
    activity.setCourseId(request.getCourseId());
    activity.setCourseName(teaching.getCourseName());
    activity.setTitle(resolveTitle(request.getTitle(), teaching.getCourseName()));
    activity.setTeacherUserId(userPrincipal.getId());
    activity.setTeacherNo(identity.getIdentityNo());
    activity.setStartTime(request.getStartTime());
    activity.setEndTime(request.getEndTime());
    activity.setStatus(ACTIVE);
    activity.setCreatedAt(now);
    activity.setUpdatedAt(now);
    checkInDao.insertActivity(activity);
    requestedClassCodes.forEach(classCode -> checkInDao.insertActivityClass(checkInId, classCode));
    return toActivityVO(activity, List.copyOf(requestedClassCodes));
  }

  @Override
  public List<AvailableCheckInActivityVO> listAvailableActivities(UserPrincipal userPrincipal) {
    requireRole(userPrincipal, UserRole.STUDENT);
    StudentClassResponse student = requireCurrentStudent(userPrincipal);
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
    LocalDate[] range = normalizeDateRange(begin, end);
    int normalizedPage = page == null || page < 1 ? 1 : page;
    int normalizedPageSize = pageSize == null || pageSize < 10 ? 10 : pageSize;
    Long queryStudentId = studentId;
    Long teacherUserId = null;
    if (userPrincipal.getRole() == UserRole.STUDENT) {
      StudentClassResponse student = requireCurrentStudent(userPrincipal);
      queryStudentId = student.getStudentId();
    } else if (userPrincipal.getRole() == UserRole.TEACHER) {
      teacherUserId = userPrincipal.getId();
    }
    Long total =
        checkInDao.countRecords(
            queryStudentId, blankToNull(checkInId), teacherUserId, range[0], range[1]);
    List<CheckInRecordVO> records =
        checkInDao.selectRecords(
            queryStudentId,
            blankToNull(checkInId),
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
      throw new BadRequestException("学生ID不能为空");
    }
    int normalizedLimit = limit == null || limit < 1 ? 10 : limit;
    StudentCheckInSummaryResponse summary =
        checkInDao.selectSummaries(List.of(studentId)).stream()
            .findFirst()
            .orElseThrow(() -> new BadRequestException("学生不存在"));
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
    response.setRecentRecords(records.stream().map(this::toRecordItem).toList());
    return response;
  }

  @Override
  @Transactional
  public String studentCheckIn(UserPrincipal userPrincipal, String checkInId) {
    requireRole(userPrincipal, UserRole.STUDENT);
    StudentClassResponse student = requireCurrentStudent(userPrincipal);
    CheckInActivity activity = checkInDao.findActivity(checkInId);
    if (activity == null) {
      throw new BadRequestException("打卡活动不存在");
    }
    LocalDateTime now = LocalDateTime.now();
    if (!ACTIVE.equals(activity.getStatus())
        || now.isBefore(activity.getStartTime())
        || now.isAfter(activity.getEndTime())) {
      throw new BadRequestException("当前打卡已结束");
    }
    if (!checkInDao.findActivityClassCodes(checkInId).contains(student.getClassCode())) {
      throw new ForbiddenException("无权参与该班级打卡");
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
    throw new BadRequestException("请使用打卡ID进行打卡");
  }

  private StudentClassResponse requireCurrentStudent(UserPrincipal userPrincipal) {
    UserIdentityResponse identity = requireIdentity(userPrincipal.getId(), IDENTITY_STUDENT);
    StudentClassResponse student = studentServiceClient.getStudentClass(identity.getIdentityNo());
    if (student == null || student.getClassCode() == null || student.getClassCode().isBlank()) {
      throw new BadRequestException("学生未绑定班级");
    }
    return student;
  }

  private UserIdentityResponse requireIdentity(Long userId, String identityType) {
    UserIdentityResponse identity = authServiceClient.getIdentity(userId, identityType);
    if (identity == null
        || identity.getIdentityNo() == null
        || identity.getIdentityNo().isBlank()) {
      throw new BadRequestException("用户未绑定" + identityType + "身份");
    }
    return identity;
  }

  private void requireRole(UserPrincipal userPrincipal, UserRole requiredRole) {
    if (userPrincipal == null || userPrincipal.getRole() != requiredRole) {
      throw new ForbiddenException("无权执行该操作");
    }
  }

  private void validateActivityRequest(CreateCheckInActivityRequest request) {
    if (request.getStartTime() == null
        || request.getEndTime() == null
        || !request.getStartTime().isBefore(request.getEndTime())) {
      throw new BadRequestException("打卡时间范围不合法");
    }
  }

  private Set<String> normalizeClassCodes(List<String> classCodes) {
    Set<String> values = new LinkedHashSet<>();
    for (String classCode : classCodes) {
      if (classCode != null && !classCode.isBlank()) {
        values.add(classCode.trim());
      }
    }
    if (values.isEmpty()) {
      throw new BadRequestException("班级不能为空");
    }
    return values;
  }

  private LocalDate[] normalizeDateRange(LocalDate begin, LocalDate end) {
    LocalDate normalizedBegin = begin == null ? LocalDate.now() : begin;
    LocalDate normalizedEnd = end == null ? normalizedBegin : end;
    if (normalizedBegin.isAfter(normalizedEnd)) {
      throw new BadRequestException("开始日期不能晚于结束日期");
    }
    return new LocalDate[] {normalizedBegin, normalizedEnd};
  }

  private String resolveTitle(String title, String courseName) {
    return title == null || title.isBlank() ? courseName + "课堂打卡" : title.trim();
  }

  private CheckInActivityVO toActivityVO(CheckInActivity activity, List<String> classCodes) {
    CheckInActivityVO vo = new CheckInActivityVO();
    vo.setCheckInId(activity.getCheckInId());
    vo.setCourseId(activity.getCourseId());
    vo.setCourseName(activity.getCourseName());
    vo.setTitle(activity.getTitle());
    vo.setTeacherNo(activity.getTeacherNo());
    vo.setClassCodes(classCodes);
    vo.setStatus(activity.getStatus());
    vo.setStartTime(activity.getStartTime());
    vo.setEndTime(activity.getEndTime());
    return vo;
  }

  private StudentCheckInDetailResponse.CheckInRecordItem toRecordItem(CheckInRecordVO record) {
    StudentCheckInDetailResponse.CheckInRecordItem item =
        new StudentCheckInDetailResponse.CheckInRecordItem();
    item.setCheckDate(record.getCheckDate().toString());
    item.setCheckedIn(record.getCheckedIn());
    item.setCheckTime(record.getCheckTime());
    return item;
  }

  private String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
