package cn.edu.cqut.advisorplatform.dto.request;

public class TaskQueryRequest {

  private String assigneeNo;
  private Integer taskStatus;
  private String taskType;
  private Long studentId;
  private Integer page = 0;
  private Integer size = 20;

  public String getAssigneeNo() {
    return assigneeNo;
  }

  public void setAssigneeNo(String assigneeNo) {
    this.assigneeNo = assigneeNo;
  }

  public Integer getTaskStatus() {
    return taskStatus;
  }

  public void setTaskStatus(Integer taskStatus) {
    this.taskStatus = taskStatus;
  }

  public String getTaskType() {
    return taskType;
  }

  public void setTaskType(String taskType) {
    this.taskType = taskType;
  }

  public Long getStudentId() {
    return studentId;
  }

  public void setStudentId(Long studentId) {
    this.studentId = studentId;
  }

  public Integer getPage() {
    return page;
  }

  public void setPage(Integer page) {
    this.page = page;
  }

  public Integer getSize() {
    return size;
  }

  public void setSize(Integer size) {
    this.size = size;
  }
}
