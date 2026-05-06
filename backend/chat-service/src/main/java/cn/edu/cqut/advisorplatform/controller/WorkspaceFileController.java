package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.WorkspaceFileResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.WorkspaceFileService;
import java.util.List;
import lombok.RequiredArgsConstructor;
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
      @PathVariable("sessionId") Long sessionId) {
    return ApiResponseDTO.success(workspaceFileService.listFiles(sessionId));
  }

  @DeleteMapping("/files/{fileId}")
  public ApiResponseDTO<Void> deleteFile(
      @PathVariable("fileId") Long fileId, @AuthenticationPrincipal @Nullable UserDO currentUser) {
    workspaceFileService.deleteFile(fileId, currentUser);
    return ApiResponseDTO.success(null);
  }

  @GetMapping("/files/{fileId}/content")
  public ResponseEntity<byte[]> getFileContent(@PathVariable("fileId") Long fileId) {
    String filePath = workspaceFileService.getFilePath(fileId);
    try {
      java.nio.file.Path path = java.nio.file.Paths.get(filePath);
      byte[] data = java.nio.file.Files.readAllBytes(path);
      return ResponseEntity.ok()
          .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
          .body(data);
    } catch (java.io.IOException e) {
      return ResponseEntity.notFound().build();
    }
  }
}
