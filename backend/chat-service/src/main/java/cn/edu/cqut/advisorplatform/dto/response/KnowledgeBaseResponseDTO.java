package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class KnowledgeBaseResponseDTO {

  private Long id;
  private String name;
  private String description;
  private Integer docCount;
  private String status;
  private LocalDateTime createdAt;

  public static KnowledgeBaseResponseDTO from(RagKnowledgeBaseDO kb) {
    KnowledgeBaseResponseDTO r = new KnowledgeBaseResponseDTO();
    r.setId(kb.getId());
    r.setName(kb.getName());
    r.setDescription(kb.getDescription());
    r.setDocCount(kb.getDocCount());
    r.setStatus(kb.getStatus().name());
    r.setCreatedAt(kb.getCreatedAt());
    return r;
  }
}
