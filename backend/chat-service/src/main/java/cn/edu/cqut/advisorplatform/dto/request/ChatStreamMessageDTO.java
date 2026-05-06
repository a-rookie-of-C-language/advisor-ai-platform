package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Data;

@Data
public class ChatStreamMessageDTO {

  @NotBlank private String role;

  @NotBlank private String content;

  private List<Long> attachments;
}
