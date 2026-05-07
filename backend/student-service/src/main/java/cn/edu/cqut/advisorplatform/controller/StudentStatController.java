package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.StatOverviewResponse;
import cn.edu.cqut.advisorplatform.service.StudentStatService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/stat")
public class StudentStatController {

  private final StudentStatService statService;

  public StudentStatController(StudentStatService statService) {
    this.statService = statService;
  }

  @GetMapping("/overview")
  public ApiResponse<StatOverviewResponse> getOverview() {
    StatOverviewResponse response = statService.getOverview();
    return ApiResponse.success(response);
  }
}
