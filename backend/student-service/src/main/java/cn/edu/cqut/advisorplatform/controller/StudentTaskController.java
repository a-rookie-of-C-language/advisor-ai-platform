package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.TaskCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskStatusUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.PageResponse;
import cn.edu.cqut.advisorplatform.dto.response.StudentTaskResponse;
import cn.edu.cqut.advisorplatform.service.StudentTaskService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/task")
public class StudentTaskController {

  private final StudentTaskService taskService;

  public StudentTaskController(StudentTaskService taskService) {
    this.taskService = taskService;
  }

  @GetMapping("/page")
  public ApiResponse<PageResponse<StudentTaskResponse>> queryTasks(TaskQueryRequest request) {
    Page<StudentTaskResponse> page = taskService.queryTasks(request);
    return ApiResponse.success(PageResponse.from(page));
  }

  @GetMapping("/{id}")
  public ApiResponse<StudentTaskResponse> getTaskById(@PathVariable Long id) {
    StudentTaskResponse response = taskService.getTaskById(id);
    return ApiResponse.success(response);
  }

  @PostMapping
  public ApiResponse<StudentTaskResponse> createTask(
      @Valid @RequestBody TaskCreateRequest request) {
    StudentTaskResponse response = taskService.createTask(request, "system");
    return ApiResponse.success(response);
  }

  @PutMapping("/{id}/status")
  public ApiResponse<StudentTaskResponse> updateTaskStatus(
      @PathVariable Long id, @Valid @RequestBody TaskStatusUpdateRequest request) {
    StudentTaskResponse response = taskService.updateTaskStatus(id, request, "system");
    return ApiResponse.success(response);
  }

  @GetMapping("/student/{studentId}")
  public ApiResponse<PageResponse<StudentTaskResponse>> getTasksByStudentId(
      @PathVariable Long studentId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<StudentTaskResponse> response = taskService.getTasksByStudentId(studentId, page, size);
    return ApiResponse.success(PageResponse.from(response));
  }
}
