package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ChatStreamRequestDTO {

    @Valid
    @NotEmpty
    private List<ChatStreamMessageDTO> messages;

    @NotNull
    private Long sessionId;

    private Long kbId;
}
