package cn.edu.cqut.advisorplatform.checkin.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AttendanceMarkRequest {
  @NotNull private Long studentId;
  @NotNull private String status;
  private String remark;
}
