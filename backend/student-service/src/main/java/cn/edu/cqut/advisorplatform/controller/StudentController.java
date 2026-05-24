package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.StudentCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.PageResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInDetailResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentCheckInSummaryResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentDetailResponse;
import cn.edu.cqut.advisorplatform.service.StudentCheckInService;
import cn.edu.cqut.advisorplatform.service.StudentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
public class StudentController {

  private final StudentService studentService;
  private final StudentCheckInService studentCheckInService;

  public StudentController(
      StudentService studentService, StudentCheckInService studentCheckInService) {
    this.studentService = studentService;
    this.studentCheckInService = studentCheckInService;
  }

  @GetMapping("/page")
  public ApiResponse<PageResponse<StudentDetailResponse>> queryStudents(
      StudentQueryRequest request) {
    Page<StudentDetailResponse> page = studentService.queryStudents(request);
    return ApiResponse.success(PageResponse.from(page));
  }

  @GetMapping("/{id}")
  public ApiResponse<StudentDetailResponse> getStudentById(@PathVariable("id") Long id) {
    StudentDetailResponse response = studentService.getStudentById(id);
    return ApiResponse.success(response);
  }

  @GetMapping("/{id}/check-in/summary")
  public ApiResponse<StudentCheckInSummaryResponse> getStudentCheckInSummary(
      @PathVariable("id") Long id) {
    return ApiResponse.success(studentCheckInService.getStudentCheckInSummary(id));
  }

  @GetMapping("/{id}/check-in/detail")
  public ApiResponse<StudentCheckInDetailResponse> getStudentCheckInDetail(
      @PathVariable("id") Long id, @RequestParam("limit") Integer limit) {
    return ApiResponse.success(studentCheckInService.getStudentCheckInDetail(id, limit));
  }

  @GetMapping("/check-in/summaries")
  public ApiResponse<List<StudentCheckInSummaryResponse>> listStudentCheckInSummaries(
      @RequestParam(value = "keyword", required = false) String keyword,
      @RequestParam(value = "page", defaultValue = "0") int page,
      @RequestParam(value = "size", defaultValue = "10") int size) {
    return ApiResponse.success(
        studentCheckInService.listStudentCheckInSummaries(keyword, page, size));
  }

  @PostMapping
  public ApiResponse<StudentDetailResponse> createStudent(
      @Valid @RequestBody StudentCreateRequest request) {
    StudentDetailResponse response = studentService.createStudent(request, "system");
    return ApiResponse.success(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<StudentDetailResponse> updateStudent(
      @PathVariable("id") Long id, @Valid @RequestBody StudentUpdateRequest request) {
    request.setId(id);
    StudentDetailResponse response = studentService.updateStudent(request, "system");
    return ApiResponse.success(response);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> deleteStudent(@PathVariable("id") Long id) {
    studentService.deleteStudent(id, "system");
    return ApiResponse.success(null);
  }
}
