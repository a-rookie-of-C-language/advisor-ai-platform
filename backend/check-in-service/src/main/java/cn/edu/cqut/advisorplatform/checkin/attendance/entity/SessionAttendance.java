package cn.edu.cqut.advisorplatform.checkin.attendance.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class SessionAttendance {
  private Long id;
  private Long sessionId;
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String classCode;
  private String status;
  private String remark;
  private Long recordedBy;
  private LocalDateTime recordedAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
