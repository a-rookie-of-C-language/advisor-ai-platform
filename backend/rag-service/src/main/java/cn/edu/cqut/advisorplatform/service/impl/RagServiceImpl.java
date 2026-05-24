package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dao.RagDocumentDao;
import cn.edu.cqut.advisorplatform.dao.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.service.RagService;
import cn.edu.cqut.advisorplatform.service.impl.rag.RagFileSupport;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagServiceImpl implements RagService {

  private final RagKnowledgeBaseDao knowledgeBaseDao;
  private final RagDocumentDao documentDao;
  private final RagFileSupport ragFileSupport;

  @Value("${advisor.rag.upload-dir}")
  private String uploadDir;

  @Override
  public List<KnowledgeBaseResponseDTO> listKnowledgeBases(@Nullable UserPrincipal currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("链未登录或登录失效");
    }
    return knowledgeBaseDao.findAllByOrderByCreatedAtDesc().stream()
        .map(KnowledgeBaseResponseDTO::from)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public KnowledgeBaseResponseDTO createKnowledgeBase(
      String name, String description, @Nullable UserPrincipal currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("链未登录或登录失效");
    }
    RagKnowledgeBaseDO kb = new RagKnowledgeBaseDO();
    kb.setName(name);
    kb.setDescription(description);
    kb.setCreatedBy(ragFileSupport.toUserReference(currentUser));
    kb.setDocCount(0);
    kb.setStatus(RagKnowledgeBaseDO.KnowledgeBaseStatus.READY);
    kb.setCreatedAt(LocalDateTime.now());
    kb.setUpdatedAt(LocalDateTime.now());
    return KnowledgeBaseResponseDTO.from(knowledgeBaseDao.save(kb));
  }

  @Override
  @Transactional
  public void deleteKnowledgeBase(Long id, @Nullable UserPrincipal currentUser) {
    RagKnowledgeBaseDO kb =
        knowledgeBaseDao.findById(id).orElseThrow(() -> new NotFoundException("知识库不存在"));
    if (!ragFileSupport.isKnowledgeBaseOwner(kb, currentUser)) {
      throw new ForbiddenException("无权限访问该知识库");
    }
    ragFileSupport.deleteDirectoryQuietly(
        ragFileSupport.resolveUploadBaseDir(uploadDir).resolve(id.toString()).normalize());
    knowledgeBaseDao.deleteById(id);
  }

  @Override
  public List<RagDocumentResponseDTO> listDocuments(
      Long kbId, @Nullable UserPrincipal currentUser) {
    knowledgeBaseDao.findById(kbId).orElseThrow(() -> new NotFoundException("知识库不存在"));
    return documentDao.findByKnowledgeBaseIdOrderByCreatedAtDesc(kbId).stream()
        .map(RagDocumentResponseDTO::from)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public RagDocumentResponseDTO uploadDocument(
      Long kbId, MultipartFile file, @Nullable UserPrincipal currentUser) {
    RagKnowledgeBaseDO kb =
        knowledgeBaseDao.findById(kbId).orElseThrow(() -> new NotFoundException("知识库不存在"));

    Assert.notNull(file, () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(!file.isEmpty(), () -> new BadRequestException("上传文件不能为空"));

    String originalFilename = file.getOriginalFilename();
    Assert.notBlank(originalFilename, () -> new BadRequestException("文件名不能为空"));
    String safeFilename = ragFileSupport.safeFilename(originalFilename);
    Assert.notBlank(safeFilename, () -> new BadRequestException("非法文件名"));

    String fileType = ragFileSupport.extractExtension(safeFilename);

    var baseDir = ragFileSupport.resolveUploadBaseDir(uploadDir);
    var dir = baseDir.resolve(kbId.toString()).normalize();
    var filePath = dir.resolve(safeFilename).normalize();

    if (!filePath.startsWith(baseDir)) {
      throw new BadRequestException("非法文件路径");
    }

    try {
      Files.createDirectories(dir);
      try (InputStream in = file.getInputStream()) {
        Files.copy(in, filePath, StandardCopyOption.REPLACE_EXISTING);
      }

      RagDocumentDO doc = new RagDocumentDO();
      doc.setKnowledgeBase(kb);
      doc.setFileName(safeFilename);
      doc.setFileType(fileType);
      doc.setFileSize(file.getSize());
      doc.setFilePath(filePath.toAbsolutePath().toString());
      doc.setStatus(RagDocumentDO.DocumentStatus.PENDING);
      doc.setUploadedBy(ragFileSupport.toUserReference(currentUser));
      doc.setCreatedAt(LocalDateTime.now());
      doc.setUpdatedAt(LocalDateTime.now());
      RagDocumentDO saved = documentDao.save(doc);

      kb.setDocCount(kb.getDocCount() + 1);
      kb.setUpdatedAt(LocalDateTime.now());
      knowledgeBaseDao.save(kb);

      log.info("文档上传成功，documentId={}, path={}", saved.getId(), filePath);
      return RagDocumentResponseDTO.from(saved);
    } catch (IOException e) {
      throw new BadRequestException("文件保存失败: " + e.getMessage());
    }
  }

  @Override
  @Transactional
  public void deleteDocument(Long id, @Nullable UserPrincipal currentUser) {
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

  @Override
  public boolean existsKnowledgeBase(Long id) {
    if (id == null || id <= 0) {
      return false;
    }
    return knowledgeBaseDao.existsById(id);
  }
}
