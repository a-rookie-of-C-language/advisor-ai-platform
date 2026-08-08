package cn.edu.cqut.advisorplatform.service.impl.workspace;

import cn.edu.cqut.advisorplatform.common.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.WorkspaceFileDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class WorkspaceFileSupport {

  private static final Set<String> ALLOWED_TYPES =
      Set.of("jpg", "jpeg", "png", "gif", "webp", "pdf", "docx", "md", "txt");
  private static final byte[][] IMAGE_MAGIC = {
    {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
    {(byte) 0x89, 0x50, 0x4E, 0x47},
    {0x47, 0x49, 0x46, 0x38},
    {0x52, 0x49, 0x46, 0x46},
  };

  @Value("${advisor.workspace.upload-dir:workspace-uploads}")
  private String uploadDir;

  public Path resolveUploadBaseDir() {
    return Paths.get(uploadDir).toAbsolutePath().normalize();
  }

  public Path resolveFilePath(Long sessionId, String safeFilename) {
    Path baseDir = resolveUploadBaseDir();
    Path sessionDir = baseDir.resolve(sessionId.toString()).normalize();
    Path filePath = sessionDir.resolve(safeFilename).normalize();
    if (!filePath.startsWith(baseDir)) {
      throw new BadRequestException("非法文件路径");
    }
    return filePath;
  }

  public String extractExtension(String filename) {
    int lastDot = filename.lastIndexOf('.');
    if (lastDot < 0 || lastDot == filename.length() - 1) {
      return "";
    }
    return filename.substring(lastDot + 1);
  }

  public boolean isAllowedType(String fileType) {
    return ALLOWED_TYPES.contains(fileType.toLowerCase());
  }

  public boolean isImageType(String fileType) {
    return Arrays.asList("jpg", "jpeg", "png", "gif", "webp").contains(fileType.toLowerCase());
  }

  public boolean validateImageMagic(InputStream in) throws IOException {
    byte[] header = in.readNBytes(8);
    for (byte[] magic : IMAGE_MAGIC) {
      if (header.length < magic.length) {
        continue;
      }
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

  public void copyTo(InputStream in, Path filePath) throws IOException {
    Files.copy(in, filePath, StandardCopyOption.REPLACE_EXISTING);
  }

  public void deleteFileQuietly(Path path) {
    try {
      Files.deleteIfExists(path);
    } catch (IOException e) {
      log.warn("删除文件失败: {}", path, e);
    }
  }

  public boolean canAccessFile(WorkspaceFileDO file, UserDO currentUser) {
    if (file == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }
    UserDO uploader = file.getUploadedBy();
    if (uploader != null
        && uploader.getId() != null
        && uploader.getId().equals(currentUser.getId())) {
      return true;
    }
    ChatSessionDO session = file.getSession();
    return session != null
        && session.getUser() != null
        && session.getUser().getId() != null
        && session.getUser().getId().equals(currentUser.getId());
  }

  public void requireFileAccess(WorkspaceFileDO file, UserDO currentUser) {
    if (!canAccessFile(file, currentUser)) {
      throw new ForbiddenException("无权访问该文件");
    }
  }
}
