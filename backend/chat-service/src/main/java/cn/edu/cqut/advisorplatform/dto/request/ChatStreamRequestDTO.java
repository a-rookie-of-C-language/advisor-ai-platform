package cn.edu.cqut.advisorplatform.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Data;
import org.springframework.lang.Nullable;

@Data
public class ChatStreamRequestDTO {

  @Valid @NotEmpty private List<ChatStreamMessageDTO> messages;

  @NotNull private Long sessionId;

  @Nullable private Long kbId;

  private List<Long> attachments;
}
