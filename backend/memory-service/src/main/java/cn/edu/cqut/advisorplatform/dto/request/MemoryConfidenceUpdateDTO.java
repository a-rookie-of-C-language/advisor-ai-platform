package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemoryConfidenceUpdateDTO {

  @NotNull
  @Min(0)
  @Max(1)
  private Double confidence;
}
