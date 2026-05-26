package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.DocumentStatus;
import cn.edu.cqut.advisorplatform.entity.KnowledgeBaseStatus;
import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import java.time.LocalDateTime;

class RagEntityFactory {

  RagKnowledgeBaseDO createKnowledgeBase(
      String name, String description, UserDO createdBy, LocalDateTime now) {
    RagKnowledgeBaseDO kb = new RagKnowledgeBaseDO();
    kb.setName(name);
    kb.setDescription(description);
    kb.setCreatedBy(createdBy);
    kb.setDocCount(0);
    kb.setStatus(KnowledgeBaseStatus.READY);
    kb.setCreatedAt(now);
    kb.setUpdatedAt(now);
    return kb;
  }

  RagDocumentDO createDocument(
      RagKnowledgeBaseDO kb,
      String safeFilename,
      String fileType,
      long fileSize,
      String filePath,
      UserDO uploadedBy,
      LocalDateTime now) {
    RagDocumentDO doc = new RagDocumentDO();
    doc.setKnowledgeBase(kb);
    doc.setFileName(safeFilename);
    doc.setFileType(fileType);
    doc.setFileSize(fileSize);
    doc.setFilePath(filePath);
    doc.setStatus(DocumentStatus.PENDING);
    doc.setUploadedBy(uploadedBy);
    doc.setCreatedAt(now);
    doc.setUpdatedAt(now);
    return doc;
  }
}
