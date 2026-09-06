package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dao.RagDocumentDao;
import cn.edu.cqut.advisorplatform.dao.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.service.impl.rag.RagDocumentStorageSupport;
import cn.edu.cqut.advisorplatform.service.impl.rag.RagFileSupport;
import cn.edu.cqut.advisorplatform.service.impl.rag.StoredRagDocumentFile;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
@RequiredArgsConstructor
class RagDocumentMutationSupport {

  private final RagKnowledgeBaseDao knowledgeBaseDao;
  private final RagDocumentDao documentDao;
  private final RagFileSupport ragFileSupport;
  private final RagDocumentStorageSupport ragDocumentStorageSupport;
  private final RagEntityFactory entityFactory = new RagEntityFactory();

  RagDocumentResponseDTO uploadDocument(
      Long knowledgeBaseId,
      MultipartFile file,
      @Nullable UserPrincipal currentUser,
      String uploadDir) {
    RagKnowledgeBaseDO kb =
        knowledgeBaseDao
            .findById(knowledgeBaseId)
            .orElseThrow(() -> new NotFoundException("知识库不存在"));

    StoredRagDocumentFile storedFile =
        ragDocumentStorageSupport.store(knowledgeBaseId, file, uploadDir);
    RagDocumentDO saved = documentDao.save(createDocument(kb, storedFile, currentUser));

    kb.setDocCount(kb.getDocCount() + 1);
    kb.setUpdatedAt(LocalDateTime.now());
    knowledgeBaseDao.save(kb);

    log.info("文档上传成功，documentId={}, path={}", saved.getId(), storedFile.getFilePath());
    return RagDocumentResponseDTO.from(saved);
  }

  void deleteDocument(Long id, @Nullable UserPrincipal currentUser, String uploadDir) {
    RagDocumentDO doc = documentDao.findById(id).orElseThrow(() -> new NotFoundException("文档不存在"));
    if (!ragFileSupport.canDeleteDocument(doc, currentUser)) {
      throw new ForbiddenException("无权限删除该文档");
    }

    var safeFilePath = ragFileSupport.resolveSafeStoredFilePath(doc.getFilePath(), uploadDir);
    if (safeFilePath != null) {
      ragFileSupport.deleteFileQuietly(safeFilePath);
    }

    RagKnowledgeBaseDO kb = doc.getKnowledgeBase();
    kb.setDocCount(Math.max(0, kb.getDocCount() - 1));
    kb.setUpdatedAt(LocalDateTime.now());
    knowledgeBaseDao.save(kb);

    documentDao.deleteById(id);
  }

  private RagDocumentDO createDocument(
      RagKnowledgeBaseDO kb,
      StoredRagDocumentFile storedFile,
      @Nullable UserPrincipal currentUser) {
    return entityFactory.createDocument(
        kb,
        storedFile.getSafeFilename(),
        storedFile.getFileType(),
        storedFile.getSize(),
        storedFile.getFilePath().toAbsolutePath().toString(),
        ragFileSupport.toUserReference(currentUser),
        LocalDateTime.now());
  }
}
