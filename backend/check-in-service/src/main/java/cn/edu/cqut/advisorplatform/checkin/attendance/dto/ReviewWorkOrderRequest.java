package cn.edu.cqut.advisorplatform.checkin.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewWorkOrderRequest {
  @NotBlank private String status;
  private String reviewNote;
}
