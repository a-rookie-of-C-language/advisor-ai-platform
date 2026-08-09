package cn.edu.cqut.advisorplatform.checkin.attendance.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class AttendanceWorkOrder {
  private Long id;
  private Long sessionId;
  private String classCode;
  private String type;
  private String status;
  private String reason;
  private LocalDate targetSessionDate;
  private LocalDateTime targetStartTime;
  private LocalDateTime targetEndTime;
  private String targetLocation;
  private Long applicantId;
  private Long reviewerId;
  private String reviewNote;
  private LocalDateTime reviewedAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
