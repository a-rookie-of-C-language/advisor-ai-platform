package cn.edu.cqut.advisorplatform.entity;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RagDocumentDO {
  private Long id;
  private Long knowledgeBaseId;
  private RagKnowledgeBaseDO knowledgeBase;
  private String fileName;
  private String fileType;
  private Long fileSize;
  private String filePath;
  private String content;
  private String embedding;
  private DocumentStatus status = DocumentStatus.PENDING;
  private Long uploadedById;
  private UserDO uploadedBy;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public enum DocumentStatus {
    PENDING,
    INDEXING,
    READY,
    FAILED
  }
}
