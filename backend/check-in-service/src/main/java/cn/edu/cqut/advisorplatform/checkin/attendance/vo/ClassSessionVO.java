package cn.edu.cqut.advisorplatform.checkin.attendance.vo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ClassSessionVO {
  private Long id;
  private String term;
  private String classCode;
  private String courseCode;
  private String courseName;
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
}
