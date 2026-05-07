package cn.edu.cqut.advisorplatform.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "student_task",
    indexes = {
      @Index(name = "idx_task_student_id", columnList = "student_id"),
      @Index(name = "idx_task_status", columnList = "task_status"),
      @Index(name = "idx_task_assignee_no", columnList = "assignee_no"),
      @Index(name = "idx_task_type", columnList = "task_type"),
      @Index(name = "idx_task_created_at", columnList = "created_at")
    })
public class StudentTask {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = false)
  private StudentProfile student;

  @Column(name = "task_type", nullable = false, length = 32)
  private String taskType;

  @Column(name = "task_status", nullable = false)
  private Integer taskStatus = 0;

  @Column(name = "assignee_no", length = 32)
  private String assigneeNo;

  @Column(name = "assignee_name", length = 64)
  private String assigneeName;

  @Column(name = "description", columnDefinition = "TEXT")
  private String description;

  @Column(name = "handle_note", columnDefinition = "TEXT")
  private String handleNote;

  @Column(name = "handle_time")
  private LocalDateTime handleTime;

  @Column(name = "created_by", length = 64)
  private String createdBy;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_by", length = 64)
  private String updatedBy;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public StudentProfile getStudent() {
    return student;
  }

  public void setStudent(StudentProfile student) {
    this.student = student;
  }

  public String getTaskType() {
    return taskType;
  }

  public void setTaskType(String taskType) {
    this.taskType = taskType;
  }

  public Integer getTaskStatus() {
    return taskStatus;
  }

  public void setTaskStatus(Integer taskStatus) {
    this.taskStatus = taskStatus;
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

  public String getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(String createdBy) {
    this.createdBy = createdBy;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public String getUpdatedBy() {
    return updatedBy;
  }

  public void setUpdatedBy(String updatedBy) {
    this.updatedBy = updatedBy;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
