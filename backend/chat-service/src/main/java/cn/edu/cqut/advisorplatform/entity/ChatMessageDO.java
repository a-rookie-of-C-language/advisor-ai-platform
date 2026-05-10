package cn.edu.cqut.advisorplatform.entity;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatMessageDO {
  private Long id;
  private Long sessionId;
  private Long userId;
  private String turnId;
  private String role;
  private String content;
  private List<SourceReference> sources;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  @Data
  @NoArgsConstructor
  public static class SourceReference {
    private Long documentId;
    private String docName;
    private String snippet;
  }
}
