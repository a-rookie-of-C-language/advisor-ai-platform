package cn.edu.cqut.advisorplatform.service.impl.rag;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@RequiredArgsConstructor
public class RagDocumentStorageSupport {

  private final RagFileSupport ragFileSupport;

  public StoredRagDocumentFile store(Long kbId, MultipartFile file, String uploadDir) {
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
      return new StoredRagDocumentFile(safeFilename, fileType, file.getSize(), filePath);
    } catch (IOException e) {
      throw new BadRequestException("文件保存失败: " + e.getMessage());
    }
  }
}
