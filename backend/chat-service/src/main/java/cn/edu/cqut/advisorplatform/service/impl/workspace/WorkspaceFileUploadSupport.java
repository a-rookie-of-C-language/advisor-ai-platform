package cn.edu.cqut.advisorplatform.service.impl.workspace;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dao.WorkspaceFileDao;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.WorkspaceFileDO;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
@RequiredArgsConstructor
class WorkspaceFileUploadSupport {

  private static final long MAX_FILE_SIZE = 20 * 1024 * 1024;

  private final WorkspaceFileDao workspaceFileDao;
  private final WorkspaceFileSupport workspaceFileSupport;

  WorkspaceFileDO upload(ChatSessionDO session, MultipartFile file, @Nullable UserDO currentUser) {
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

    Path filePath = workspaceFileSupport.resolveFilePath(session.getId(), safeFilename);

    try {
      Files.createDirectories(filePath.getParent());
      validateImageHeaderIfNeeded(file, fileType);
      copyFile(file, filePath);
      WorkspaceFileDO saved =
          workspaceFileDao.save(
              createEntity(session, file, currentUser, safeFilename, fileType, filePath));
      log.info("工作区文件上传成功，fileId={}, path={}", saved.getId(), filePath);
      return saved;
    } catch (IOException e) {
      throw new BadRequestException("文件保存失败: " + e.getMessage());
    }
  }

  private void validateImageHeaderIfNeeded(MultipartFile file, String fileType) throws IOException {
    try (InputStream in = file.getInputStream()) {
      if (workspaceFileSupport.isImageType(fileType)
          && !workspaceFileSupport.validateImageMagic(in)) {
        throw new BadRequestException("图片文件头校验失败");
      }
    }
  }

  private void copyFile(MultipartFile file, Path filePath) throws IOException {
    try (InputStream in = file.getInputStream()) {
      workspaceFileSupport.copyTo(in, filePath);
    }
  }

  private WorkspaceFileDO createEntity(
      ChatSessionDO session,
      MultipartFile file,
      @Nullable UserDO currentUser,
      String safeFilename,
      String fileType,
      Path filePath) {
    WorkspaceFileDO workspaceFile = new WorkspaceFileDO();
    workspaceFile.setSession(session);
    workspaceFile.setFileName(safeFilename);
    workspaceFile.setFileType(fileType);
    workspaceFile.setFileSize(file.getSize());
    workspaceFile.setFilePath(filePath.toAbsolutePath().toString());
    workspaceFile.setUploadedBy(currentUser);
    workspaceFile.setCreatedAt(LocalDateTime.now());
    return workspaceFile;
  }
}
