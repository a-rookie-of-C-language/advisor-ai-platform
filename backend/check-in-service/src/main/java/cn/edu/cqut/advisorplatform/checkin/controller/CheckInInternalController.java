package cn.edu.cqut.advisorplatform.checkin.controller;

import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.checkin.record.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.checkin.service.CheckInService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/check-in")
@RequiredArgsConstructor
public class CheckInInternalController {

  private final CheckInService checkInService;

  @GetMapping("/summary")
  public List<StudentCheckInSummaryResponse> listStudentCheckInSummaries(
      @RequestParam("studentIds") List<Long> studentIds) {
    return checkInService.listStudentCheckInSummaries(studentIds);
  }

  @GetMapping("/{studentId}")
  public StudentCheckInDetailResponse getStudentCheckInDetail(
      @PathVariable("studentId") Long studentId,
      @RequestParam(name = "limit", defaultValue = "10") Integer limit) {
    return checkInService.getStudentCheckInDetail(studentId, limit);
  }
}
