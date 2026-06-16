package cn.edu.cqut.advisorplatform.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateIssueRequestDTO {

  @NotBlank
  @Size(max = 256)
  private String title;

  @NotBlank private String content;
}
