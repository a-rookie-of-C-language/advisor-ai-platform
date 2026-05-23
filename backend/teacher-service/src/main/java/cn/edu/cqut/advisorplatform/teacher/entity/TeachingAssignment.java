package cn.edu.cqut.advisorplatform.teacher.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@Table(name = "teaching_assignment")
public class TeachingAssignment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "teacher_no", nullable = false, length = 32)
  private String teacherNo;

  @Column(name = "course_id", nullable = false)
  private Long courseId;

  @Column(name = "class_code", nullable = false, length = 64)
  private String classCode;

  @Column(nullable = false, length = 32)
  private String semester;

  @Column(name = "start_date")
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(nullable = false, length = 16)
  private String status = "ACTIVE";

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  private Integer deleted = 0;
}
