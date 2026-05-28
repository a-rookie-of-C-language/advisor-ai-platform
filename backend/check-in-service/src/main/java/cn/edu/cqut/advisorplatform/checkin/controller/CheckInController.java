package cn.edu.cqut.advisorplatform.checkin.controller;

import cn.edu.cqut.advisorplatform.checkin.record.dto.CreateCheckInActivityRequest;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.checkin.record.entity.CheckInException;
import cn.edu.cqut.advisorplatform.checkin.record.vo.AvailableCheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInActivityVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.CheckInRecordVO;
import cn.edu.cqut.advisorplatform.checkin.record.vo.PageResultVO;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @PathVariable("checkInId") String checkInId) {
    return ApiResponseDTO.success(checkInService.studentCheckIn(userPrincipal, checkInId));
  }

  @PostMapping("/student")
  public ApiResponseDTO<String> studentCheckInWithoutActivity() {
    return ApiResponseDTO.success(checkInService.studentCheckIn((Long) null));
  }

  @GetMapping("/records")
  public ApiResponseDTO<PageResultVO<CheckInRecordVO>> listCheckInRecords(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "studentId", required = false) Long studentId,
      @RequestParam(name = "checkInId", required = false) String checkInId,
      @RequestParam(name = "begin", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate begin,
      @RequestParam(name = "end", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate end,
      @RequestParam(name = "page", defaultValue = "1") Integer page,
      @RequestParam(name = "pageSize", defaultValue = "10") Integer pageSize) {
    return ApiResponseDTO.success(
        checkInService.listCheckInRecords(
            userPrincipal, studentId, checkInId, begin, end, page, pageSize));
  }

  // 异常处理
  @PostMapping("/exceptions/{exceptionId}/handle")
  public ApiResponseDTO<CheckInException> handleException(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @PathVariable("exceptionId") Long exceptionId,
      @RequestBody Map<String, String> request) {
    return ApiResponseDTO.success(
        checkInService.handleException(
            userPrincipal,
            exceptionId,
            request.get("status"),
            request.get("handlerNote")));
  }

  @GetMapping("/exceptions")
  public ApiResponseDTO<List<CheckInException>> listExceptions(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "studentId", required = false) Long studentId,
      @RequestParam(name = "checkInId", required = false) String checkInId,
      @RequestParam(name = "status", required = false) String status) {
    return ApiResponseDTO.success(
        checkInService.listExceptions(userPrincipal, studentId, checkInId, status));
  }

  // 统计查询
  @GetMapping("/statistics")
  public ApiResponseDTO<Map<String, Object>> getAttendanceStatistics(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "begin", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate begin,
      @RequestParam(name = "end", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate end) {
    return ApiResponseDTO.success(
        checkInService.getAttendanceStatistics(userPrincipal, begin, end));
  }

  @GetMapping("/statistics/class")
  public ApiResponseDTO<List<Map<String, Object>>> getClassAttendanceStatistics(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "begin", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate begin,
      @RequestParam(name = "end", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate end) {
    return ApiResponseDTO.success(
        checkInService.getClassAttendanceStatistics(userPrincipal, begin, end));
  }

  // 导出
  @GetMapping("/export")
  public ResponseEntity<byte[]> exportAttendanceRecords(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "studentId", required = false) Long studentId,
      @RequestParam(name = "checkInId", required = false) String checkInId,
      @RequestParam(name = "begin", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate begin,
      @RequestParam(name = "end", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd")
          LocalDate end) {
    byte[] data = checkInService.exportAttendanceRecords(
        userPrincipal, studentId, checkInId, begin, end);
    
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=attendance.xlsx")
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(data);
  }
}
