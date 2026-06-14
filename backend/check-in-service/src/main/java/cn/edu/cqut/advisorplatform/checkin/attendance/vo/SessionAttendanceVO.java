package cn.edu.cqut.advisorplatform.checkin.attendance.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class SessionAttendanceVO {
  private Long id;
  private Long sessionId;
  private Long studentId;
  private String studentNo;
  private String studentName;
  private String classCode;
  private String status;
  private String remark;
  private LocalDateTime recordedAt;
}
