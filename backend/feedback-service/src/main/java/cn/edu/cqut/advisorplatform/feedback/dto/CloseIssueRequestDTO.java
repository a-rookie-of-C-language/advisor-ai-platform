package cn.edu.cqut.advisorplatform.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CloseIssueRequestDTO {

  @NotBlank private String reason;
}
