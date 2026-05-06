package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
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
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
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
public class WorkspaceFileServiceImpl implements WorkspaceFileService {

  private static final Set<String> ALLOWED_TYPES =
      Set.of("jpg", "jpeg", "png", "gif", "webp", "pdf", "docx", "md", "txt");
  private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  private static final byte[][] IMAGE_MAGIC = {
    {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}, // JPEG
    {(byte) 0x89, 0x50, 0x4E, 0x47}, // PNG
    {0x47, 0x49, 0x46, 0x38}, // GIF
    {0x52, 0x49, 0x46, 0x46}, // RIFF (WebP container)
  };

  private final WorkspaceFileDao workspaceFileDao;
  private final ChatSessionDao chatSessionDao;

  @Value("${advisor.workspace.upload-dir:workspace-uploads}")
  private String uploadDir;

  @Override
  @Transactional
  public WorkspaceFileResponseDTO uploadFile(
      Long sessionId, MultipartFile file, @Nullable UserDO currentUser) {
    ChatSessionDO session =
        chatSessionDao.findById(sessionId).orElseThrow(() -> new NotFoundException("会话不存在"));

    Assert.notNull(file, () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(!file.isEmpty(), () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(file.getSize() <= MAX_FILE_SIZE, () -> new BadRequestException("文件大小不能超过20MB"));

    String originalFilename = file.getOriginalFilename();
    Assert.notBlank(originalFilename, () -> new BadRequestException("文件名不能为空"));
    String safeFilename = Paths.get(originalFilename).getFileName().toString();
    Assert.notBlank(safeFilename, () -> new BadRequestException("非法文件名"));

    String fileType = extractExtension(safeFilename);
    Assert.isTrue(
        ALLOWED_TYPES.contains(fileType.toLowerCase()),
        () -> new BadRequestException("不支持的文件类型: " + fileType));

    Path baseDir = resolveUploadBaseDir();
    Path sessionDir = baseDir.resolve(sessionId.toString()).normalize();
    Path filePath = sessionDir.resolve(safeFilename).normalize();

    if (!filePath.startsWith(baseDir)) {
      throw new BadRequestException("非法文件路径");
    }

    try {
      Files.createDirectories(sessionDir);
      try (InputStream in = file.getInputStream()) {
        if (isImageType(fileType) && !validateImageMagic(in)) {
          throw new BadRequestException("图片文件头校验失败");
        }
      }
      try (InputStream in = file.getInputStream()) {
        Files.copy(in, filePath, StandardCopyOption.REPLACE_EXISTING);
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
  public List<WorkspaceFileResponseDTO> listFiles(Long sessionId) {
    return workspaceFileDao.findBySessionIdOrderByCreatedAtDesc(sessionId).stream()
        .map(this::toResponseDTO)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public void deleteFile(Long fileId, @Nullable UserDO currentUser) {
    WorkspaceFileDO file =
        workspaceFileDao.findById(fileId).orElseThrow(() -> new NotFoundException("文件不存在"));
    Path path = Paths.get(file.getFilePath());
    try {
      Files.deleteIfExists(path);
    } catch (IOException e) {
      log.warn("删除文件失败: {}", path, e);
    }
    workspaceFileDao.deleteById(fileId);
  }

  @Override
  public String getFilePath(Long fileId) {
    WorkspaceFileDO file =
        workspaceFileDao.findById(fileId).orElseThrow(() -> new NotFoundException("文件不存在"));
    return file.getFilePath();
  }

  private Path resolveUploadBaseDir() {
    return Paths.get(uploadDir).toAbsolutePath().normalize();
  }

  private String extractExtension(String filename) {
    int lastDot = filename.lastIndexOf('.');
    if (lastDot < 0 || lastDot == filename.length() - 1) {
      return "";
    }
    return filename.substring(lastDot + 1);
  }

  private boolean isImageType(String fileType) {
    return Arrays.asList("jpg", "jpeg", "png", "gif", "webp").contains(fileType.toLowerCase());
  }

  private boolean validateImageMagic(InputStream in) throws IOException {
    byte[] header = in.readNBytes(8);
    for (byte[] magic : IMAGE_MAGIC) {
      boolean match = true;
      for (int i = 0; i < magic.length; i++) {
        if (header[i] != magic[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return true;
      }
    }
    return false;
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
