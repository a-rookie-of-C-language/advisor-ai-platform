package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBase;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class KnowledgeBaseResponse {

    private Long id;
    private String name;
    private String description;
    private Integer docCount;
    private String status;
    private LocalDateTime createdAt;

    public static KnowledgeBaseResponse from(RagKnowledgeBase kb) {
        KnowledgeBaseResponse r = new KnowledgeBaseResponse();
        r.setId(kb.getId());
        r.setName(kb.getName());
        r.setDescription(kb.getDescription());
        r.setDocCount(kb.getDocCount());
        r.setStatus(kb.getStatus().name());
        r.setCreatedAt(kb.getCreatedAt());
        return r;
    }
}
