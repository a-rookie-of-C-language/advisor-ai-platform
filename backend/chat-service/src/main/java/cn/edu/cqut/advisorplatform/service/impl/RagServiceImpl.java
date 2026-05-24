package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.RagDocumentDao;
import cn.edu.cqut.advisorplatform.dao.RagKnowledgeBaseDao;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.RagService;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

  @Override
  public List<KnowledgeBaseResponseDTO> listKnowledgeBases(@Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    return knowledgeBaseDao.findAllByOrderByCreatedAtDesc().stream()
        .map(KnowledgeBaseResponseDTO::from)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public KnowledgeBaseResponseDTO createKnowledgeBase(
      String name, String description, @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    RagKnowledgeBaseDO kb = new RagKnowledgeBaseDO();
    kb.setName(name);
    kb.setDescription(description);
    kb.setCreatedBy(currentUser);
    kb.setDocCount(0);
    kb.setStatus(RagKnowledgeBaseDO.KnowledgeBaseStatus.READY);
    kb.setCreatedAt(LocalDateTime.now());
    kb.setUpdatedAt(LocalDateTime.now());
    return KnowledgeBaseResponseDTO.from(knowledgeBaseDao.save(kb));
  }

  @Override
  @Transactional
  public void deleteKnowledgeBase(Long id, @Nullable UserDO currentUser) {
    RagKnowledgeBaseDO kb =
        knowledgeBaseDao.findById(id).orElseThrow(() -> new NotFoundException("知识库不存在"));
    if (!isKnowledgeBaseOwner(kb, currentUser)) {
      throw new ForbiddenException("无权限访问该知识库");
    }
    Path kbDir = ragFileSupport.resolveKnowledgeBaseDir(id);
    ragFileSupport.deleteDirectoryQuietly(kbDir);
    knowledgeBaseDao.deleteById(id);
  }

  @Override
  public List<RagDocumentResponseDTO> listDocuments(Long kbId, UserDO currentUser) {
    knowledgeBaseDao.findById(kbId).orElseThrow(() -> new NotFoundException("知识库不存在"));
    return documentDao.findByKnowledgeBaseIdOrderByCreatedAtDesc(kbId).stream()
        .map(RagDocumentResponseDTO::from)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public RagDocumentResponseDTO uploadDocument(
      Long kbId, MultipartFile file, @Nullable UserDO currentUser) {
    RagKnowledgeBaseDO kb =
        knowledgeBaseDao.findById(kbId).orElseThrow(() -> new NotFoundException("知识库不存在"));

    Assert.notNull(file, () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(!file.isEmpty(), () -> new BadRequestException("上传文件不能为空"));

    String originalFilename = file.getOriginalFilename();
    Assert.notBlank(originalFilename, () -> new BadRequestException("文件名不能为空"));
    String safeOriginalFilename = originalFilename == null ? "" : originalFilename;

    String safeFilename = Path.of(safeOriginalFilename).getFileName().toString();
    Assert.notBlank(safeFilename, () -> new BadRequestException("非法文件名"));

    String fileType = ragFileSupport.extractExtension(safeFilename);

    Path filePath = ragFileSupport.resolveDocumentPath(kbId, safeFilename);

    try {
      Files.createDirectories(filePath.getParent());
      try (InputStream in = file.getInputStream()) {
        Files.copy(in, filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
      }

      RagDocumentDO doc = new RagDocumentDO();
      doc.setKnowledgeBase(kb);
      doc.setFileName(safeFilename);
      doc.setFileType(fileType);
      doc.setFileSize(file.getSize());
      doc.setFilePath(filePath.toAbsolutePath().toString());
      doc.setStatus(RagDocumentDO.DocumentStatus.PENDING);
      doc.setUploadedBy(currentUser);
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
  public void deleteDocument(Long id, @Nullable UserDO currentUser) {
    RagDocumentDO doc = documentDao.findById(id).orElseThrow(() -> new NotFoundException("文档不存在"));
    if (!canDeleteDocument(doc, currentUser)) {
      throw new ForbiddenException("无权限删除该文档");
    }

    Path safeFilePath = ragFileSupport.resolveSafeStoredFilePath(doc.getFilePath());
    if (safeFilePath != null) {
      ragFileSupport.deleteFileQuietly(safeFilePath);
    }

    RagKnowledgeBaseDO kb = doc.getKnowledgeBase();
    kb.setDocCount(Math.max(0, kb.getDocCount() - 1));
    kb.setUpdatedAt(LocalDateTime.now());
    knowledgeBaseDao.save(kb);

    documentDao.deleteById(id);
  }

  private boolean isKnowledgeBaseOwner(RagKnowledgeBaseDO kb, @Nullable UserDO currentUser) {
    if (kb == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }
    UserDO owner = kb.getCreatedBy();
    return owner != null && owner.getId() != null && owner.getId().equals(currentUser.getId());
  }

  private boolean canDeleteDocument(RagDocumentDO doc, @Nullable UserDO currentUser) {
    if (doc == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }

    UserDO uploader = doc.getUploadedBy();
    if (uploader != null && uploader.getId() != null) {
      return uploader.getId().equals(currentUser.getId());
    }

    return isKnowledgeBaseOwner(doc.getKnowledgeBase(), currentUser);
  }
}
