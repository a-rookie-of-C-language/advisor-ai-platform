package cn.edu.cqut.advisorplatform.service.impl.student;

import cn.edu.cqut.advisorplatform.dto.request.TaskCreateRequest;
import cn.edu.cqut.advisorplatform.dto.request.TaskStatusUpdateRequest;
import cn.edu.cqut.advisorplatform.entity.StudentProfile;
import cn.edu.cqut.advisorplatform.entity.StudentTask;
import cn.edu.cqut.advisorplatform.enums.TaskStatus;
import cn.edu.cqut.advisorplatform.enums.TaskType;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
class StudentTaskMutationSupport {

  StudentTask createTask(StudentProfile student, TaskCreateRequest request, String operator) {
    StudentTask task = new StudentTask();
    task.setStudent(student);
    task.setTaskType(request.getTaskType());
    task.setTaskStatus(TaskStatus.PENDING.getCode());
    task.setAssigneeNo(request.getAssigneeNo());
    task.setAssigneeName(request.getAssigneeName());
    task.setDescription(request.getDescription());
    applyCreatedAuditFields(task, operator);
    return task;
  }

  void updateStatus(StudentTask task, TaskStatusUpdateRequest request, String operator) {
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
  }

  StudentTask createInfoMissingTask(StudentProfile student, String operator) {
    StudentTask task = new StudentTask();
    task.setStudent(student);
    task.setTaskType(TaskType.INFO_MISSING.getCode());
    task.setTaskStatus(TaskStatus.PENDING.getCode());
    task.setAssigneeNo(student.getCounselorNo());
    task.setDescription(
        "学生 " + student.getName() + " (" + student.getStudentNo() + ") 信息缺失，请补充联系方式");
    applyCreatedAuditFields(task, operator);
    return task;
  }

  private void applyCreatedAuditFields(StudentTask task, String operator) {
    LocalDateTime now = LocalDateTime.now();
    task.setCreatedBy(operator);
    task.setCreatedAt(now);
    task.setUpdatedBy(operator);
    task.setUpdatedAt(now);
  }
}
