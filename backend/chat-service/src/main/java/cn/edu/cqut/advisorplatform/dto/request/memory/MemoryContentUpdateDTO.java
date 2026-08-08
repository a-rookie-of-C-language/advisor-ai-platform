package cn.edu.cqut.advisorplatform.dto.request.memory;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MemoryContentUpdateDTO {

  @NotBlank private String content;

  @NotNull
  @Min(0)
  @Max(1)
  private Double confidence;
}
