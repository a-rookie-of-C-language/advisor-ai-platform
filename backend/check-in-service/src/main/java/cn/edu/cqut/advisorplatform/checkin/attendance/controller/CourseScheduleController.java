package cn.edu.cqut.advisorplatform.checkin.attendance.controller;

import cn.edu.cqut.advisorplatform.checkin.attendance.service.CourseScheduleService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.CourseScheduleImportResultVO;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/check-in/course-schedules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
public class CourseScheduleController {
  private final CourseScheduleService courseScheduleService;

  @PostMapping("/import")
  public ApiResponseDTO<CourseScheduleImportResultVO> importSchedules(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam("file") MultipartFile file) {
    return ApiResponseDTO.success(courseScheduleService.importSchedules(userPrincipal, file));
  }
}
