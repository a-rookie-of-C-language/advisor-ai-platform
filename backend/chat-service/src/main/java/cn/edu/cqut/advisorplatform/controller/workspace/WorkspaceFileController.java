package cn.edu.cqut.advisorplatform.controller.workspace;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.workspace.WorkspaceFileResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.WorkspaceFileService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/workspace")
@RequiredArgsConstructor
public class WorkspaceFileController {

  private final WorkspaceFileService workspaceFileService;

  @PostMapping("/files")
  public ApiResponseDTO<WorkspaceFileResponseDTO> uploadFile(
      @RequestParam("sessionId") Long sessionId,
      @RequestParam("file") MultipartFile file,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    return ApiResponseDTO.success(workspaceFileService.uploadFile(sessionId, file, currentUser));
  }

  @GetMapping("/sessions/{sessionId}/files")
  public ApiResponseDTO<List<WorkspaceFileResponseDTO>> listFiles(
      @PathVariable("sessionId") Long sessionId,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    return ApiResponseDTO.success(workspaceFileService.listFiles(sessionId, currentUser));
  }

  @DeleteMapping("/files/{fileId}")
  public ApiResponseDTO<Void> deleteFile(
      @PathVariable("fileId") Long fileId, @AuthenticationPrincipal @Nullable UserDO currentUser) {
    workspaceFileService.deleteFile(fileId, currentUser);
    return ApiResponseDTO.success(null);
  }

  @GetMapping("/files/{fileId}/content")
  public ResponseEntity<Resource> getFileContent(
      @PathVariable("fileId") Long fileId, @AuthenticationPrincipal @Nullable UserDO currentUser) {
    String filePath = workspaceFileService.getFilePath(fileId, currentUser);
    java.nio.file.Path path = java.nio.file.Paths.get(filePath);
    if (!java.nio.file.Files.isRegularFile(path)) {
      return ResponseEntity.notFound().build();
    }
    FileSystemResource resource = new FileSystemResource(path);
    MediaType mediaType = detectMediaType(path);
    return ResponseEntity.ok()
        .contentType(mediaType)
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=\"" + path.getFileName().toString() + "\"")
        .body(resource);
  }

  private MediaType detectMediaType(java.nio.file.Path path) {
    try {
      String type = java.nio.file.Files.probeContentType(path);
      if (type != null && !type.isBlank()) {
        return MediaType.parseMediaType(type);
      }
    } catch (java.io.IOException ignored) {
      // fall back to octet-stream
    }
    return MediaType.APPLICATION_OCTET_STREAM;
  }
}
