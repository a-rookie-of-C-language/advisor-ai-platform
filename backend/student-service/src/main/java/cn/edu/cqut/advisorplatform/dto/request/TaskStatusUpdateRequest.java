package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotNull;

public class TaskStatusUpdateRequest {

  @NotNull(message = "状态不能为空")
  private Integer taskStatus;

  private String handleNote;

  private String assigneeNo;

  private String assigneeName;

  public Integer getTaskStatus() {
    return taskStatus;
  }

  public void setTaskStatus(Integer taskStatus) {
    this.taskStatus = taskStatus;
  }

  public String getHandleNote() {
    return handleNote;
  }

  public void setHandleNote(String handleNote) {
    this.handleNote = handleNote;
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
}
