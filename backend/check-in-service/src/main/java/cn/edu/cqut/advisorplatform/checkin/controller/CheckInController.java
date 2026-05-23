package cn.edu.cqut.advisorplatform.checkin.controller;

import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/check-in")
@RequiredArgsConstructor
public class CheckInController {

  private final CheckInService checkInService;

  @PostMapping("/activities")
  public ApiResponseDTO<CheckInActivityVO> createActivity(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @Valid @RequestBody CreateCheckInActivityRequest request) {
    return ApiResponseDTO.success(checkInService.createActivity(userPrincipal, request));
  }

  @GetMapping("/activities/available")
  public ApiResponseDTO<List<AvailableCheckInActivityVO>> listAvailableActivities(
      @AuthenticationPrincipal UserPrincipal userPrincipal) {
    return ApiResponseDTO.success(checkInService.listAvailableActivities(userPrincipal));
  }

  @PostMapping("/student/{checkInId}")
  public ApiResponseDTO<String> studentCheckIn(
      @AuthenticationPrincipal UserPrincipal userPrincipal, @PathVariable String checkInId) {
    return ApiResponseDTO.success(checkInService.studentCheckIn(userPrincipal, checkInId));
  }

  @PostMapping("/student")
  public ApiResponseDTO<String> studentCheckInWithoutActivity() {
    return ApiResponseDTO.success(checkInService.studentCheckIn((Long) null));
  }

  @GetMapping("/records")
  public ApiResponseDTO<PageResultVO<CheckInRecordVO>> listCheckInRecords(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(required = false) Long studentId,
      @RequestParam(required = false) String checkInId,
      @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate begin,
      @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end,
      @RequestParam(defaultValue = "1") Integer page,
      @RequestParam(defaultValue = "10") Integer pageSize) {
    return ApiResponseDTO.success(
        checkInService.listCheckInRecords(
            userPrincipal, studentId, checkInId, begin, end, page, pageSize));
  }
}
