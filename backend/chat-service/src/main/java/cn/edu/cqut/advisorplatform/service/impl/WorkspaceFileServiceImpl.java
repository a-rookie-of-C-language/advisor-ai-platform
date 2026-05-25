package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.WorkspaceFileDao;
import cn.edu.cqut.advisorplatform.dto.response.WorkspaceFileResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.WorkspaceFileDO;
import cn.edu.cqut.advisorplatform.service.WorkspaceFileService;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceFileServiceImpl implements WorkspaceFileService {

  private static final long MAX_FILE_SIZE = 20 * 1024 * 1024;

  private final WorkspaceFileDao workspaceFileDao;
  private final ChatSessionDao chatSessionDao;
  private final WorkspaceFileSupport workspaceFileSupport;

  @Override
  @Transactional
  public WorkspaceFileResponseDTO uploadFile(
      Long sessionId, MultipartFile file, @Nullable UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    requireSessionOwner(session, currentUser);

    Assert.notNull(file, () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(!file.isEmpty(), () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(file.getSize() <= MAX_FILE_SIZE, () -> new BadRequestException("文件大小不能超过20MB"));

    String originalFilename = file.getOriginalFilename();
    Assert.notBlank(originalFilename, () -> new BadRequestException("文件名不能为空"));
    String safeFilename = Path.of(originalFilename).getFileName().toString();
    Assert.notBlank(safeFilename, () -> new BadRequestException("非法文件名"));

    String fileType = workspaceFileSupport.extractExtension(safeFilename);
    Assert.isTrue(
        workspaceFileSupport.isAllowedType(fileType),
        () -> new BadRequestException("不支持的文件类型: " + fileType));

    Path filePath = workspaceFileSupport.resolveFilePath(sessionId, safeFilename);

    try {
      Files.createDirectories(filePath.getParent());
      try (InputStream in = file.getInputStream()) {
        if (workspaceFileSupport.isImageType(fileType)
            && !workspaceFileSupport.validateImageMagic(in)) {
          throw new BadRequestException("图片文件头校验失败");
        }
      }
      try (InputStream in = file.getInputStream()) {
        workspaceFileSupport.copyTo(in, filePath);
      }

      WorkspaceFileDO workspaceFile = new WorkspaceFileDO();
      workspaceFile.setSession(session);
      workspaceFile.setFileName(safeFilename);
      workspaceFile.setFileType(fileType);
      workspaceFile.setFileSize(file.getSize());
      workspaceFile.setFilePath(filePath.toAbsolutePath().toString());
      workspaceFile.setUploadedBy(currentUser);
      workspaceFile.setCreatedAt(LocalDateTime.now());
      WorkspaceFileDO saved = workspaceFileDao.save(workspaceFile);

      log.info("工作区文件上传成功，fileId={}, path={}", saved.getId(), filePath);
      return toResponseDTO(saved);
    } catch (IOException e) {
      throw new BadRequestException("文件保存失败: " + e.getMessage());
    }
  }

  @Override
  @Transactional(readOnly = true)
  public List<WorkspaceFileResponseDTO> listFiles(Long sessionId, @Nullable UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));
    requireSessionOwner(session, currentUser);
    return workspaceFileDao.findBySessionIdOrderByCreatedAtDesc(sessionId).stream()
        .map(this::toResponseDTO)
        .toList();
  }

  @Override
  @Transactional
  public void deleteFile(Long fileId, @Nullable UserDO currentUser) {
    WorkspaceFileDO file =
        workspaceFileDao.findById(fileId).orElseThrow(() -> new NotFoundException("文件不存在"));
    workspaceFileSupport.requireFileAccess(file, currentUser);
    Path path = Path.of(file.getFilePath());
    workspaceFileSupport.deleteFileQuietly(path);
    workspaceFileDao.deleteById(fileId);
  }

  @Override
  @Transactional(readOnly = true)
  public String getFilePath(Long fileId, @Nullable UserDO currentUser) {
    WorkspaceFileDO file =
        workspaceFileDao.findById(fileId).orElseThrow(() -> new NotFoundException("文件不存在"));
    workspaceFileSupport.requireFileAccess(file, currentUser);
    return file.getFilePath();
  }

  private void requireSessionOwner(ChatSessionDO session, @Nullable UserDO currentUser) {
    if (currentUser == null || currentUser.getId() == null) {
      throw new ForbiddenException("未登录或登录已失效");
    }
    if (session.getUser() == null
        || session.getUser().getId() == null
        || !session.getUser().getId().equals(currentUser.getId())) {
      throw new ForbiddenException("无权访问该会话");
    }
  }

  private WorkspaceFileResponseDTO toResponseDTO(WorkspaceFileDO entity) {
    return WorkspaceFileResponseDTO.builder()
        .id(entity.getId())
        .fileName(entity.getFileName())
        .fileType(entity.getFileType())
        .fileSize(entity.getFileSize())
        .createdAt(entity.getCreatedAt())
        .build();
  }
}
