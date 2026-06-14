package cn.edu.cqut.advisorplatform.checkin.attendance.controller;

import cn.edu.cqut.advisorplatform.checkin.attendance.dto.CreateWorkOrderRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.dto.ReviewWorkOrderRequest;
import cn.edu.cqut.advisorplatform.checkin.attendance.service.AttendanceWorkOrderService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.AttendanceWorkOrderVO;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/check-in/work-orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR', 'MONITOR')")
public class AttendanceWorkOrderController {
  private final AttendanceWorkOrderService workOrderService;

  @PostMapping
  public ApiResponseDTO<AttendanceWorkOrderVO> create(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @Valid @RequestBody CreateWorkOrderRequest request) {
    return ApiResponseDTO.success(workOrderService.create(userPrincipal, request));
  }

  @GetMapping
  public ApiResponseDTO<List<AttendanceWorkOrderVO>> list(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "classCode", required = false) String classCode,
      @RequestParam(name = "status", required = false) String status) {
    return ApiResponseDTO.success(workOrderService.list(userPrincipal, classCode, status));
  }

  @PostMapping("/{workOrderId}/review")
  @PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
  public ApiResponseDTO<AttendanceWorkOrderVO> review(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @PathVariable("workOrderId") Long workOrderId,
      @Valid @RequestBody ReviewWorkOrderRequest request) {
    return ApiResponseDTO.success(workOrderService.review(userPrincipal, workOrderId, request));
  }
}
