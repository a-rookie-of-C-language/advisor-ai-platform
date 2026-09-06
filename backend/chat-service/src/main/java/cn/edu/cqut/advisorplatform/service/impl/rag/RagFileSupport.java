package cn.edu.cqut.advisorplatform.service.impl.rag;

import cn.edu.cqut.advisorplatform.entity.rag.RagDocumentDO;
import cn.edu.cqut.advisorplatform.entity.rag.RagKnowledgeBaseDO;
import cn.edu.cqut.advisorplatform.entity.user.UserDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RagFileSupport {

  @Value("${advisor.rag.upload-dir}")
  private String uploadDir;

  public Path resolveUploadBaseDir() {
    return Paths.get(uploadDir).toAbsolutePath().normalize();
  }

  public boolean isKnowledgeBaseOwner(RagKnowledgeBaseDO kb, @Nullable UserDO currentUser) {
    if (kb == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }
    UserDO owner = kb.getCreatedBy();
    return owner != null && owner.getId() != null && owner.getId().equals(currentUser.getId());
  }

  public boolean canDeleteDocument(RagDocumentDO doc, @Nullable UserDO currentUser) {
    if (doc == null || currentUser == null || currentUser.getId() == null) {
      return false;
    }

    UserDO uploader = doc.getUploadedBy();
    if (uploader != null && uploader.getId() != null) {
      return uploader.getId().equals(currentUser.getId());
    }

    return isKnowledgeBaseOwner(doc.getKnowledgeBase(), currentUser);
  }

  public Path resolveKnowledgeBaseDir(Long knowledgeBaseId) {
    return resolveUploadBaseDir().resolve(knowledgeBaseId.toString()).normalize();
  }

  public Path resolveDocumentPath(Long knowledgeBaseId, String safeFilename) {
    Path baseDir = resolveUploadBaseDir();
    Path dir = resolveKnowledgeBaseDir(knowledgeBaseId);
    Path filePath = dir.resolve(safeFilename).normalize();
    if (!filePath.startsWith(baseDir)) {
      throw new BadRequestException("非法文件路径");
    }
    return filePath;
  }

  public Path resolveSafeStoredFilePath(String storedPath) {
    if (storedPath == null || storedPath.trim().isEmpty()) {
      return null;
    }

    Path baseDir = resolveUploadBaseDir();
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
    try (var paths = Files.walk(dir)) {
      paths
          .sorted(Comparator.reverseOrder())
          .forEach(
              path -> {
                try {
                  Files.deleteIfExists(path);
                } catch (IOException e) {
                  log.warn("删除失败: {}", path, e);
                }
              });
    } catch (IOException e) {
      log.warn("删除目录失败: {}", dir, e);
    }
  }
}
