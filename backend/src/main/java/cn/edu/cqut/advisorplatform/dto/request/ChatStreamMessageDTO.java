package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatStreamMessageDTO {

    @NotBlank
    private String role;

    @NotBlank
    private String content;
}
