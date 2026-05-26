package cn.edu.cqut.advisorplatform.checkin.service.impl;

import cn.edu.cqut.advisorplatform.checkin.client.TeacherServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.common.security.UserRole;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckInServiceImpl implements CheckInService {
  private final CheckInDao checkInDao;
  private final CheckInServiceSupport checkInServiceSupport;
  private final CheckInEntityFactory entityFactory = new CheckInEntityFactory();
  private final CheckInDetailResponseFactory detailResponseFactory =
      new CheckInDetailResponseFactory();
  private final CheckInActivityCreator activityCreator;
  private final StudentCheckInProcessor studentCheckInProcessor;
  private final CheckInRecordQuerySupport recordQuerySupport;

  public CheckInServiceImpl(
      CheckInDao checkInDao,
      TeacherServiceClient teacherServiceClient,
      CheckInServiceSupport checkInServiceSupport) {
    this.checkInDao = checkInDao;
    this.checkInServiceSupport = checkInServiceSupport;
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
        checkInDao.selectRecords(
            studentId,
            null,
            null,
            LocalDate.now().minusDays(3650),
            LocalDate.now(),
            normalizedLimit,
            0);
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
}
