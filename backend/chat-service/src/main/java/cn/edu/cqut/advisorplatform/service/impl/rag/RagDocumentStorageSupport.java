package cn.edu.cqut.advisorplatform.service.impl.rag;

import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@RequiredArgsConstructor
public class RagDocumentStorageSupport {

  private final RagFileSupport ragFileSupport;

  public StoredRagDocumentFile store(Long knowledgeBaseId, MultipartFile file) {
    Assert.notNull(file, () -> new BadRequestException("上传文件不能为空"));
    Assert.isTrue(!file.isEmpty(), () -> new BadRequestException("上传文件不能为空"));

    String originalFilename = file.getOriginalFilename();
    Assert.notBlank(originalFilename, () -> new BadRequestException("文件名不能为空"));
    String safeOriginalFilename = originalFilename == null ? "" : originalFilename;
    String safeFilename = Path.of(safeOriginalFilename).getFileName().toString();
    Assert.notBlank(safeFilename, () -> new BadRequestException("非法文件名"));

    String fileType = ragFileSupport.extractExtension(safeFilename);
    Path filePath = ragFileSupport.resolveDocumentPath(knowledgeBaseId, safeFilename);

    try {
      Files.createDirectories(filePath.getParent());
      try (InputStream in = file.getInputStream()) {
        Files.copy(in, filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
      }
      return new StoredRagDocumentFile(safeFilename, fileType, file.getSize(), filePath);
    } catch (IOException e) {
      throw new BadRequestException("文件保存失败: " + e.getMessage());
    }
  }
}
