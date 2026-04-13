package cn.edu.cqut.advisorplatform.dto.response;

import cn.edu.cqut.advisorplatform.entity.RagDocument;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RagDocumentResponse {

    private Long id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String status;
    private LocalDateTime createdAt;

    public static RagDocumentResponse from(RagDocument doc) {
        RagDocumentResponse r = new RagDocumentResponse();
        r.setId(doc.getId());
        r.setFileName(doc.getFileName());
        r.setFileType(doc.getFileType());
        r.setFileSize(doc.getFileSize());
        r.setStatus(doc.getStatus().name());
        r.setCreatedAt(doc.getCreatedAt());
        return r;
    }
}
