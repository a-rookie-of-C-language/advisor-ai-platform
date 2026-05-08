package cn.edu.cqut.advisorplatform.checkin.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.checkin.mapper.StudentCheckInRecordMapper;
import cn.edu.cqut.advisorplatform.checkin.record.entity.StudentCheckInRecord;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CheckInServiceImplTest {

  @InjectMocks private CheckInServiceImpl checkInService;

  @Mock private StudentCheckInRecordMapper mapper;

  @Test
  void listCheckInRecords_shouldApplyDefaultDateAndPaging() {
    UserPrincipal userPrincipal = new UserPrincipal(1L, "student1", "advisor");

    CheckInRecordVO record = new CheckInRecordVO();
    record.setStudentId(1L);
    record.setCheckDate(LocalDate.now());
    record.setCheckedIn(true);
    when(mapper.countCheckInRecords(1L, LocalDate.now(), LocalDate.now())).thenReturn(1L);
    when(mapper.selectCheckInRecords(1L, LocalDate.now(), LocalDate.now(), 10, 0))
        .thenReturn(List.of(record));

    PageResultVO<CheckInRecordVO> result =
        checkInService.listCheckInRecords(userPrincipal, null, null, null, null, null);

    assertEquals(1L, result.getTotal());
    assertEquals(1, result.getRecords().size());
    verify(mapper).countCheckInRecords(1L, LocalDate.now(), LocalDate.now());
    verify(mapper).selectCheckInRecords(1L, LocalDate.now(), LocalDate.now(), 10, 0);
  }

  @Test
  void listCheckInRecords_shouldRejectInvalidDateRange() {
    UserPrincipal userPrincipal = new UserPrincipal(1L, "student1", "advisor");

    assertThrows(
        BadRequestException.class,
        () ->
            checkInService.listCheckInRecords(
                userPrincipal, 1L, LocalDate.of(2026, 5, 8), LocalDate.of(2026, 5, 7), 1, 10));
  }

  @Test
  void studentCheckIn_shouldRejectNullStudentId() {
    assertThrows(BadRequestException.class, () -> checkInService.studentCheckIn(null));
  }

  @Test
  void studentCheckIn_shouldReturnAlreadyCheckedInWhenRecordExists() {
    when(mapper.ifStudentCheckIn(any())).thenReturn(true);

    String result = checkInService.studentCheckIn(1L);

    assertEquals("今日已打卡", result);
    verify(mapper).ifStudentCheckIn(any());
  }

  @Test
  void studentCheckIn_shouldInsertWhenRecordMissing() {
    StudentCheckInRecord record = new StudentCheckInRecord();
    record.setStudentId(1L);
    record.setCheckDate(LocalDate.now());
    when(mapper.ifStudentCheckIn(any())).thenReturn(null);
    when(mapper.studentCheckIn(any())).thenReturn(1);

    String result = checkInService.studentCheckIn(1L);

    assertEquals("打卡成功", result);
    verify(mapper).studentCheckIn(any());
  }

  @Test
  void studentCheckIn_shouldReturnAlreadyCheckedInWhenInsertConflictOccurs() {
    when(mapper.ifStudentCheckIn(any())).thenReturn(null);
    when(mapper.studentCheckIn(any())).thenReturn(0);

    String result = checkInService.studentCheckIn(1L);

    assertEquals("今日已打卡", result);
    verify(mapper).studentCheckIn(any());
  }
}
