package cn.edu.cqut.advisorplatform.checkin.attendance.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ClassSession {
  private Long id;
  private Long scheduleId;
  private String term;
  private String classCode;
  private String courseCode;
  private String courseName;
  private String teacherNo;
  private String teacherName;
  private Integer weekNo;
  private Integer weekday;
  private Integer periodStart;
  private Integer periodEnd;
  private LocalDate sessionDate;
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private String location;
  private String status;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
