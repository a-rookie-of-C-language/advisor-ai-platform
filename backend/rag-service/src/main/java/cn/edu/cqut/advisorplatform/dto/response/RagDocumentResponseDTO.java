package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class RagDocumentResponseDTO {

  private Long id;
  private String fileName;
  private String fileType;
  private Long fileSize;
  private String status;
  private LocalDateTime createdAt;

  public static RagDocumentResponseDTO from(RagDocumentDO doc) {
    RagDocumentResponseDTO r = new RagDocumentResponseDTO();
    r.setId(doc.getId());
    r.setFileName(doc.getFileName());
    r.setFileType(doc.getFileType());
    r.setFileSize(doc.getFileSize());
    r.setStatus(doc.getStatus().name());
    r.setCreatedAt(doc.getCreatedAt());
    return r;
  }
}
