package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.StudentCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.StudentUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.PageResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentDetailResponse;
import cn.edu.cqut.advisorplatform.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
public class StudentController {

  private final StudentService studentService;

  public StudentController(StudentService studentService) {
    this.studentService = studentService;
  }

  @GetMapping("/page")
  public ApiResponse<PageResponse<StudentDetailResponse>> queryStudents(
      StudentQueryRequest request) {
    Page<StudentDetailResponse> page = studentService.queryStudents(request);
    return ApiResponse.success(PageResponse.from(page));
  }

  @GetMapping("/{id}")
  public ApiResponse<StudentDetailResponse> getStudentById(@PathVariable Long id) {
    StudentDetailResponse response = studentService.getStudentById(id);
    return ApiResponse.success(response);
  }

  @PostMapping
  public ApiResponse<StudentDetailResponse> createStudent(
      @Valid @RequestBody StudentCreateRequest request) {
    StudentDetailResponse response = studentService.createStudent(request, "system");
    return ApiResponse.success(response);
  }

  @PutMapping("/{id}")
  public ApiResponse<StudentDetailResponse> updateStudent(
      @PathVariable Long id, @Valid @RequestBody StudentUpdateRequest request) {
    request.setId(id);
    StudentDetailResponse response = studentService.updateStudent(request, "system");
    return ApiResponse.success(response);
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> deleteStudent(@PathVariable Long id) {
    studentService.deleteStudent(id, "system");
    return ApiResponse.success(null);
  }
}
