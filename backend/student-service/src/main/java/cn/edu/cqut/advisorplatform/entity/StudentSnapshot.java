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
    name = "student_snapshot",
    indexes = {
      @Index(name = "idx_snapshot_student_id", columnList = "student_id"),
      @Index(name = "idx_snapshot_semester", columnList = "semester"),
      @Index(name = "idx_snapshot_type", columnList = "snapshot_type"),
      @Index(name = "idx_snapshot_created_at", columnList = "created_at")
    })
public class StudentSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = false)
  private StudentProfile student;

  @Column(name = "student_no", nullable = false, length = 32)
  private String studentNo;

  @Column(name = "semester", length = 16)
  private String semester;

  @Column(name = "snapshot_type", length = 32)
  private String snapshotType;

  @Column(name = "snapshot_data", nullable = false, columnDefinition = "jsonb")
  private String snapshotData;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

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

  public String getStudentNo() {
    return studentNo;
  }

  public void setStudentNo(String studentNo) {
    this.studentNo = studentNo;
  }

  public String getSemester() {
    return semester;
  }

  public void setSemester(String semester) {
    this.semester = semester;
  }

  public String getSnapshotType() {
    return snapshotType;
  }

  public void setSnapshotType(String snapshotType) {
    this.snapshotType = snapshotType;
  }

  public String getSnapshotData() {
    return snapshotData;
  }

  public void setSnapshotData(String snapshotData) {
    this.snapshotData = snapshotData;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
