package cn.edu.cqut.advisorplatform.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RagKnowledgeBaseDO {
  private Long id;
  private Long createdById;
  private UserDO createdBy;
  private String name;
  private String description;
  private Integer docCount = 0;
  private Boolean isDeleted = false;
  private KnowledgeBaseStatus status = KnowledgeBaseStatus.READY;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public enum KnowledgeBaseStatus {
    READY,
    INDEXING
  }
}
