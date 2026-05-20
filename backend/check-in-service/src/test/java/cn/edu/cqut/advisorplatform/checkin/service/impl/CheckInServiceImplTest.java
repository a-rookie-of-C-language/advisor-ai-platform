package cn.edu.cqut.advisorplatform.checkin.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.checkin.client.AuthServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.StudentServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.TeacherServiceClient;
import cn.edu.cqut.advisorplatform.checkin.client.dto.CourseTeachingClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.StudentClassResponse;
import cn.edu.cqut.advisorplatform.checkin.client.dto.UserIdentityResponse;
import cn.edu.cqut.advisorplatform.checkin.dao.CheckInDao;
import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInActivity;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CheckInServiceImplTest {

  @InjectMocks private CheckInServiceImpl checkInService;

  @Mock private CheckInDao checkInDao;
  @Mock private AuthServiceClient authServiceClient;
  @Mock private StudentServiceClient studentServiceClient;
  @Mock private TeacherServiceClient teacherServiceClient;

  @Test
  void createActivity_shouldCreateWhenTeacherOwnsClass() {
    UserPrincipal teacher = new UserPrincipal(1L, "teacher", "TEACHER");
    CreateCheckInActivityRequest request = new CreateCheckInActivityRequest();
    request.setCourseId(1L);
    request.setClassCodes(List.of("C1"));
    request.setStartTime(LocalDateTime.now().minusMinutes(1));
    request.setEndTime(LocalDateTime.now().plusMinutes(30));
    when(authServiceClient.getIdentity(1L, "TEACHER")).thenReturn(identity("T001"));
    when(teacherServiceClient.getTeachingClasses("T001", 1L)).thenReturn(teaching());

    var result = checkInService.createActivity(teacher, request);

    assertEquals(1L, result.getCourseId());
    verify(checkInDao).insertActivity(any());
    verify(checkInDao).insertActivityClass(any(), any());
  }

  @Test
  void createActivity_shouldRejectClassOutsideTeachingScope() {
    UserPrincipal teacher = new UserPrincipal(1L, "teacher", "TEACHER");
    CreateCheckInActivityRequest request = new CreateCheckInActivityRequest();
    request.setCourseId(1L);
    request.setClassCodes(List.of("C2"));
    request.setStartTime(LocalDateTime.now().minusMinutes(1));
    request.setEndTime(LocalDateTime.now().plusMinutes(30));
    when(authServiceClient.getIdentity(1L, "TEACHER")).thenReturn(identity("T001"));
    when(teacherServiceClient.getTeachingClasses("T001", 1L)).thenReturn(teaching());

    assertThrows(ForbiddenException.class, () -> checkInService.createActivity(teacher, request));
  }

  @Test
  void studentCheckIn_shouldInsertWhenActivityIsValid() {
    UserPrincipal studentUser = new UserPrincipal(2L, "student", "STUDENT");
    when(authServiceClient.getIdentity(2L, "STUDENT")).thenReturn(identity("S001"));
    when(studentServiceClient.getStudentClass("S001")).thenReturn(student());
    when(checkInDao.findActivity("cid")).thenReturn(activity());
    when(checkInDao.findActivityClassCodes("cid")).thenReturn(List.of("C1"));
    when(checkInDao.existsRecord("cid", 100L)).thenReturn(false);
    when(checkInDao.insertRecord(any())).thenReturn(1);

    String result = checkInService.studentCheckIn(studentUser, "cid");

    assertEquals("打卡成功", result);
  }

  @Test
  void studentCheckIn_shouldRejectExpiredActivity() {
    UserPrincipal studentUser = new UserPrincipal(2L, "student", "STUDENT");
    CheckInActivity activity = activity();
    activity.setEndTime(LocalDateTime.now().minusMinutes(1));
    when(authServiceClient.getIdentity(2L, "STUDENT")).thenReturn(identity("S001"));
    when(studentServiceClient.getStudentClass("S001")).thenReturn(student());
    when(checkInDao.findActivity("cid")).thenReturn(activity);

    assertThrows(
        BadRequestException.class, () -> checkInService.studentCheckIn(studentUser, "cid"));
  }

  private UserIdentityResponse identity(String identityNo) {
    UserIdentityResponse response = new UserIdentityResponse();
    response.setIdentityNo(identityNo);
    return response;
  }

  private CourseTeachingClassResponse teaching() {
    CourseTeachingClassResponse response = new CourseTeachingClassResponse();
    response.setCourseId(1L);
    response.setCourseName("Java");
    response.setClassCodes(List.of("C1"));
    return response;
  }

  private StudentClassResponse student() {
    StudentClassResponse response = new StudentClassResponse();
    response.setStudentId(100L);
    response.setStudentNo("S001");
    response.setClassCode("C1");
    return response;
  }

  private CheckInActivity activity() {
    CheckInActivity activity = new CheckInActivity();
    activity.setStatus("ACTIVE");
    activity.setStartTime(LocalDateTime.now().minusMinutes(1));
    activity.setEndTime(LocalDateTime.now().plusMinutes(30));
    return activity;
  }
}
