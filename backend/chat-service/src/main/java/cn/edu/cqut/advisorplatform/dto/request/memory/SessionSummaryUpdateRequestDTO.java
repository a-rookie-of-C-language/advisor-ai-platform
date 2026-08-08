package cn.edu.cqut.advisorplatform.dto.request.memory;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SessionSummaryUpdateRequestDTO {

  @NotBlank private String summary;
}
