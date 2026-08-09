package cn.edu.cqut.advisorplatform.checkin.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CreateWorkOrderRequest {
  @NotNull private Long sessionId;
  @NotBlank private String reason;
  private LocalDate targetSessionDate;
  private LocalDateTime targetStartTime;
  private LocalDateTime targetEndTime;
  private String targetLocation;
}
