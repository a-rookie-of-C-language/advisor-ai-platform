package cn.edu.cqut.advisorplatform.memoryservice.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatSessionDO {

  private Long id;
  private Long userId;
  private String title = "新对话";
  private Long kbId = 0L;
  private Boolean isDeleted = false;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
