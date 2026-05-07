package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.StudentTask;
import cn.edu.cqut.advisorplatform.enums.TaskStatus;
import cn.edu.cqut.advisorplatform.enums.TaskType;
import java.time.LocalDateTime;

public class StudentTaskResponse {

  private Long id;
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String taskType;
  private String taskTypeText;
  private Integer taskStatus;
  private String taskStatusText;
  private String assigneeNo;
  private String assigneeName;
  private String description;
  private String handleNote;
  private LocalDateTime handleTime;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public static StudentTaskResponse fromEntity(StudentTask entity) {
    StudentTaskResponse response = new StudentTaskResponse();
    response.setId(entity.getId());
    if (entity.getStudent() != null) {
      response.setStudentId(entity.getStudent().getId());
      response.setStudentNo(entity.getStudent().getStudentNo());
      response.setStudentName(entity.getStudent().getName());
    }
    response.setTaskType(entity.getTaskType());
    TaskType tt = TaskType.fromCode(entity.getTaskType());
    response.setTaskTypeText(tt.getDescription());
    response.setTaskStatus(entity.getTaskStatus());
    TaskStatus ts = TaskStatus.fromCode(entity.getTaskStatus());
    response.setTaskStatusText(ts.getDescription());
    response.setAssigneeNo(entity.getAssigneeNo());
    response.setAssigneeName(entity.getAssigneeName());
    response.setDescription(entity.getDescription());
    response.setHandleNote(entity.getHandleNote());
    response.setHandleTime(entity.getHandleTime());
    response.setCreatedAt(entity.getCreatedAt());
    response.setUpdatedAt(entity.getUpdatedAt());
    return response;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getStudentId() {
    return studentId;
  }

  public void setStudentId(Long studentId) {
    this.studentId = studentId;
  }

  public String getStudentNo() {
    return studentNo;
  }

  public void setStudentNo(String studentNo) {
    this.studentNo = studentNo;
  }

  public String getStudentName() {
    return studentName;
  }

  public void setStudentName(String studentName) {
    this.studentName = studentName;
  }

  public String getTaskType() {
    return taskType;
  }

  public void setTaskType(String taskType) {
    this.taskType = taskType;
  }

  public String getTaskTypeText() {
    return taskTypeText;
  }

  public void setTaskTypeText(String taskTypeText) {
    this.taskTypeText = taskTypeText;
  }

  public Integer getTaskStatus() {
    return taskStatus;
  }

  public void setTaskStatus(Integer taskStatus) {
    this.taskStatus = taskStatus;
  }

  public String getTaskStatusText() {
    return taskStatusText;
  }

  public void setTaskStatusText(String taskStatusText) {
    this.taskStatusText = taskStatusText;
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

  public String getHandleNote() {
    return handleNote;
  }

  public void setHandleNote(String handleNote) {
    this.handleNote = handleNote;
  }

  public LocalDateTime getHandleTime() {
    return handleTime;
  }

  public void setHandleTime(LocalDateTime handleTime) {
    this.handleTime = handleTime;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
