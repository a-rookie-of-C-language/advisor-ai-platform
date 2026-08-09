package cn.edu.cqut.advisorplatform.checkin.record.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCheckInRecord {

  private Long id;

  private Long studentId;

  private String checkInId;

  private String classCode;

  private LocalDate checkDate;

  private Boolean checkedIn;

  private String status;

  private LocalDateTime checkTime;

  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;
}
