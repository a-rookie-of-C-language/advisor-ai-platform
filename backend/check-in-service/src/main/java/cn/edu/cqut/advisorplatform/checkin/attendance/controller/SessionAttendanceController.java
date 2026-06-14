package cn.edu.cqut.advisorplatform.checkin.attendance.controller;

import cn.edu.cqut.advisorplatform.checkin.attendance.dto.SessionAttendanceUpdateRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.SessionAttendanceService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.SessionAttendanceVO;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/check-in/class-sessions/{sessionId}/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR', 'MONITOR')")
public class SessionAttendanceController {
  private final SessionAttendanceService sessionAttendanceService;

  @GetMapping
  public ApiResponseDTO<List<SessionAttendanceVO>> getSessionAttendance(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @PathVariable("sessionId") Long sessionId) {
    return ApiResponseDTO.success(
        sessionAttendanceService.getSessionAttendance(userPrincipal, sessionId));
  }

  @PutMapping
  public ApiResponseDTO<List<SessionAttendanceVO>> updateSessionAttendance(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @PathVariable("sessionId") Long sessionId,
      @Valid @RequestBody SessionAttendanceUpdateRequest request) {
    return ApiResponseDTO.success(
        sessionAttendanceService.updateSessionAttendance(userPrincipal, sessionId, request));
  }
}
