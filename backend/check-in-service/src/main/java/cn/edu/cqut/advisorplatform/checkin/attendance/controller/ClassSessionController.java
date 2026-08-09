package cn.edu.cqut.advisorplatform.checkin.attendance.controller;

import cn.edu.cqut.advisorplatform.checkin.attendance.service.ClassSessionService;
import cn.edu.cqut.advisorplatform.checkin.attendance.vo.ClassSessionVO;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/check-in/class-sessions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR', 'MONITOR')")
public class ClassSessionController {
  private final ClassSessionService classSessionService;

  @GetMapping
  public ApiResponseDTO<List<ClassSessionVO>> listSessions(
      @AuthenticationPrincipal UserPrincipal userPrincipal,
      @RequestParam(name = "term", required = false) String term,
      @RequestParam(name = "classCode", required = false) String classCode) {
    return ApiResponseDTO.success(classSessionService.listSessions(userPrincipal, term, classCode));
  }
}
