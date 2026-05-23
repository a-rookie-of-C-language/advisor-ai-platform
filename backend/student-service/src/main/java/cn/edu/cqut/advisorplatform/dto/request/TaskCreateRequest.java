package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TaskCreateRequest {

  @NotNull(message = "学生ID不能为空")
  private Long studentId;

  @NotBlank(message = "任务类型不能为空")
  private String taskType;

  private String assigneeNo;

  private String assigneeName;

  private String description;

  public Long getStudentId() {
    return studentId;
  }

  public void setStudentId(Long studentId) {
    this.studentId = studentId;
  }

  public String getTaskType() {
    return taskType;
  }

  public void setTaskType(String taskType) {
    this.taskType = taskType;
  }

  public String getAssigneeNo() {
    return assigneeNo;
  }

  public void setAssigneeNo(String assigneeNo) {
    this.assigneeNo = assigneeNo;
  }

  public String getAssigneeName() {
    return assigneeName;
  }

  public void setAssigneeName(String assigneeName) {
    this.assigneeName = assigneeName;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }
}
