package cn.edu.cqut.advisorplatform.checkin.record.entity;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInActivity {
  private Long id;
  private String checkInId;
  private Long courseId;
  private String courseName;
  private String title;
  private Long teacherUserId;
  private String teacherNo;
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private String status;
  private Integer lateThresholdMinutes;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
