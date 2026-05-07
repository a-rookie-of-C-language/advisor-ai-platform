package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.TaskCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskStatusUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.StudentTaskResponse;
import org.springframework.data.domain.Page;

public interface StudentTaskService {

  Page<StudentTaskResponse> queryTasks(TaskQueryRequest request);

  StudentTaskResponse getTaskById(Long id);

  StudentTaskResponse createTask(TaskCreateRequest request, String operator);

  StudentTaskResponse updateTaskStatus(Long id, TaskStatusUpdateRequest request, String operator);

  void createInfoMissingTaskIfNeeded(Long studentId, String operator);

  Page<StudentTaskResponse> getTasksByStudentId(Long studentId, int page, int size);
}
