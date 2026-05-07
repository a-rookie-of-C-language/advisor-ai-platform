package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.StudentTaskDao;
import cn.edu.cqut.advisorplatform.dto.request.TaskCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskQueryRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskStatusUpdateRequest;
import cn.edu.cqut.advisorplatform.dto.response.StudentTaskResponse;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.entity.StudentTask;
import cn.edu.cqut.advisorplatform.enums.TaskStatus;
import cn.edu.cqut.advisorplatform.enums.TaskType;
import cn.edu.cqut.advisorplatform.exception.BusinessException;
import cn.edu.cqut.advisorplatform.service.StudentService;
import cn.edu.cqut.advisorplatform.service.StudentTaskService;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentTaskServiceImpl implements StudentTaskService {

  private final StudentTaskDao taskDao;
  private final StudentService studentService;

  public StudentTaskServiceImpl(StudentTaskDao taskDao, StudentService studentService) {
    this.taskDao = taskDao;
    this.studentService = studentService;
  }

  @Override
  public Page<StudentTaskResponse> queryTasks(TaskQueryRequest request) {
    PageRequest pageRequest =
        PageRequest.of(
            request.getPage(), request.getSize(), Sort.by(Sort.Direction.DESC, "createdAt"));

    Page<StudentTask> page =
        taskDao.findByConditions(
            request.getAssigneeNo(),
            request.getTaskStatus(),
            request.getTaskType(),
            request.getStudentId(),
            pageRequest);

    return page.map(StudentTaskResponse::fromEntity);
  }

  @Override
  public StudentTaskResponse getTaskById(Long id) {
    StudentTask task = taskDao.findById(id).orElseThrow(() -> new BusinessException("任务不存在"));
    return StudentTaskResponse.fromEntity(task);
  }

  @Override
  @Transactional
  public StudentTaskResponse createTask(TaskCreateRequest request, String operator) {
    StudentProfile student = studentService.getStudentEntityById(request.getStudentId());

    StudentTask task = new StudentTask();
    task.setStudent(student);
    task.setTaskType(request.getTaskType());
    task.setTaskStatus(TaskStatus.PENDING.getCode());
    task.setAssigneeNo(request.getAssigneeNo());
    task.setAssigneeName(request.getAssigneeName());
    task.setDescription(request.getDescription());
    task.setCreatedBy(operator);
    task.setCreatedAt(LocalDateTime.now());
    task.setUpdatedBy(operator);
    task.setUpdatedAt(LocalDateTime.now());

    StudentTask saved = taskDao.save(task);
    return StudentTaskResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public StudentTaskResponse updateTaskStatus(
      Long id, TaskStatusUpdateRequest request, String operator) {
    StudentTask task = taskDao.findById(id).orElseThrow(() -> new BusinessException("任务不存在"));

    task.setTaskStatus(request.getTaskStatus());
    if (request.getAssigneeNo() != null) {
      task.setAssigneeNo(request.getAssigneeNo());
    }
    if (request.getAssigneeName() != null) {
      task.setAssigneeName(request.getAssigneeName());
    }
    task.setHandleNote(request.getHandleNote());
    task.setUpdatedBy(operator);
    task.setUpdatedAt(LocalDateTime.now());

    if (request.getTaskStatus() == TaskStatus.COMPLETED.getCode()
        || request.getTaskStatus() == TaskStatus.CLOSED.getCode()) {
      task.setHandleTime(LocalDateTime.now());
    }

    StudentTask saved = taskDao.save(task);
    return StudentTaskResponse.fromEntity(saved);
  }

  @Override
  @Transactional
  public void createInfoMissingTaskIfNeeded(Long studentId, String operator) {
    StudentProfile student = studentService.getStudentEntityById(studentId);

    if (!student.isInfoMissing()) {
      return;
    }

    taskDao
        .findOpenTaskByStudentAndType(studentId, TaskType.INFO_MISSING.getCode())
        .ifPresentOrElse(
            existingTask -> {},
            () -> {
              StudentTask task = new StudentTask();
              task.setStudent(student);
              task.setTaskType(TaskType.INFO_MISSING.getCode());
              task.setTaskStatus(TaskStatus.PENDING.getCode());
              task.setAssigneeNo(student.getCounselorNo());
              task.setDescription(
                  "学生 " + student.getName() + " (" + student.getStudentNo() + ") 信息缺失，请补充联系方式");
              task.setCreatedBy(operator);
              task.setCreatedAt(LocalDateTime.now());
              task.setUpdatedBy(operator);
              task.setUpdatedAt(LocalDateTime.now());
              taskDao.save(task);
            });
  }

  @Override
  public Page<StudentTaskResponse> getTasksByStudentId(Long studentId, int page, int size) {
    PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<StudentTask> page = taskDao.findByStudentId(studentId, pageRequest);
    return page.map(StudentTaskResponse::fromEntity);
  }
}
