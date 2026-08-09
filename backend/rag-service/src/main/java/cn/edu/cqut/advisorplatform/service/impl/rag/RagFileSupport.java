package cn.edu.cqut.advisorplatform.service.impl.rag;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.entity.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.entity.UserRole;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RagFileSupport {

  public boolean isKnowledgeBaseOwner(RagKnowledgeBaseDO kb, UserPrincipal currentUser) {
    if (kb == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }
    UserDO owner = kb.getCreatedBy();
    return owner != null && owner.getId() != null && owner.getId().equals(currentUser.getId());
  }

  public boolean canDeleteDocument(RagDocumentDO doc, UserPrincipal currentUser) {
    if (doc == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }

    UserDO uploader = doc.getUploadedBy();
    if (uploader != null && uploader.getId() != null) {
      return uploader.getId().equals(currentUser.getId());
    }

    return isKnowledgeBaseOwner(doc.getKnowledgeBase(), currentUser);
  }

  public UserDO toUserReference(UserPrincipal currentUser) {
    UserDO user = new UserDO();
    user.setId(currentUser.getId());
    user.setUsername(currentUser.getUsername());
    user.setRealName(currentUser.getRealName());
    user.setRole(UserRole.valueOf(currentUser.getRole().name()));
    user.setEnabled(currentUser.isEnabled());
    return user;
  }

  public Path resolveUploadBaseDir(String uploadDir) {
    return Paths.get(uploadDir).toAbsolutePath().normalize();
  }

  public Path resolveSafeStoredFilePath(String storedPath, String uploadDir) {
    if (storedPath == null || storedPath.trim().isEmpty()) {
      return null;
    }

    Path baseDir = resolveUploadBaseDir(uploadDir);
    Path resolvedPath = Paths.get(storedPath).toAbsolutePath().normalize();
    if (!resolvedPath.startsWith(baseDir)) {
      log.warn("跳过删除越界文件路径: {}", resolvedPath);
      return null;
    }

    return resolvedPath;
  }

  public String extractExtension(String filename) {
    if (filename == null || !filename.contains(".")) {
      return "unknown";
    }
    return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
  }

  public String safeFilename(String originalFilename) {
    return Paths.get(originalFilename).getFileName().toString();
  }

  public void deleteFileQuietly(Path path) {
    try {
      Files.deleteIfExists(path);
    } catch (IOException e) {
      log.warn("删除文件失败: {}", path, e);
    }
  }

  public void deleteDirectoryQuietly(Path dir) {
    if (!Files.exists(dir)) {
      return;
    }
    try {
      Files.walk(dir)
          .sorted(java.util.Comparator.reverseOrder())
          .forEach(
              p -> {
                try {
                  Files.delete(p);
                } catch (IOException e) {
                  log.warn("删除失败: {}", p);
                }
              });
    } catch (IOException e) {
      log.warn("删除目录失败: {}", dir, e);
    }
  }
}
