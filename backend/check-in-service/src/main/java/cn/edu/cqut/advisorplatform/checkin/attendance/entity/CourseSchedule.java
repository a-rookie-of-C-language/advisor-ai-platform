package cn.edu.cqut.advisorplatform.checkin.attendance.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CourseSchedule {
  private Long id;
  private String term;
  private String classCode;
  private String courseCode;
  private String courseName;
  private String teacherNo;
  private String teacherName;
  private Integer weekStart;
  private Integer weekEnd;
  private Integer weekday;
  private Integer periodStart;
  private Integer periodEnd;
  private String location;
  private Long createdBy;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
