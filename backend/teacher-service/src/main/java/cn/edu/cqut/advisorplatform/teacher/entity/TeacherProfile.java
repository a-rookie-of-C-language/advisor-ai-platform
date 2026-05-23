package cn.edu.cqut.advisorplatform.teacher.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@Table(name = "teacher_profile")
public class TeacherProfile {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "teacher_no", nullable = false, unique = true, length = 32)
  private String teacherNo;

  @Column(nullable = false, length = 64)
  private String name;

  @Column(length = 128)
  private String college;

  @Column(length = 128)
  private String department;

  @Column(length = 64)
  private String title;

  @Column(length = 32)
  private String phone;

  @Column(length = 128)
  private String email;

  @Column(nullable = false, length = 16)
  private String status = "ACTIVE";

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  private Integer deleted = 0;
}
