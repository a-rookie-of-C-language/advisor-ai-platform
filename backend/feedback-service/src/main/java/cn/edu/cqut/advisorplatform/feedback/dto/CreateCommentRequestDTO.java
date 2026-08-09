package cn.edu.cqut.advisorplatform.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCommentRequestDTO {

  @NotBlank private String content;
}
