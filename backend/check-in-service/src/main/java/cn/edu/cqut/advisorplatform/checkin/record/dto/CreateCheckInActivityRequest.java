package cn.edu.cqut.advisorplatform.checkin.record.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class CreateCheckInActivityRequest {
  @NotNull private Long courseId;

  private String title;

  @NotEmpty private List<String> classCodes;

  @NotNull private LocalDateTime startTime;

  @NotNull private LocalDateTime endTime;

  /** 迟到阈值（分钟），默认15分钟，范围1-120 */
  @Min(1)
  @Max(120)
  private Integer lateThresholdMinutes;
}
