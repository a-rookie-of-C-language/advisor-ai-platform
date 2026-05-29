package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditModule;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.RagService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
public class RagController {

  private final RagService ragService;

  // ── 知识库 ──

  @GetMapping("/knowledge-bases")
  public ApiResponseDTO<List<KnowledgeBaseResponseDTO>> listKnowledgeBases(
      @AuthenticationPrincipal UserDO currentUser) {
    return ApiResponseDTO.success(ragService.listKnowledgeBases(currentUser));
  }

  @PostMapping("/knowledge-bases")
  @Auditable(
      module = AuditModule.RAG,
      action = AuditAction.STORE,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<KnowledgeBaseResponseDTO> createKnowledgeBase(
      @RequestBody Map<String, String> body,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    return ApiResponseDTO.success(
        ragService.createKnowledgeBase(body.get("name"), body.get("description"), currentUser));
  }

  @DeleteMapping("/knowledge-bases/{id}")
  @Auditable(
      module = AuditModule.RAG,
      action = AuditAction.DELETE,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<Void> deleteKnowledgeBase(
      @PathVariable Long id, @AuthenticationPrincipal @Nullable UserDO currentUser) {
    ragService.deleteKnowledgeBase(id, currentUser);
    return ApiResponseDTO.success();
  }

  // ── 文档 ──

  @GetMapping("/knowledge-bases/{kbId}/documents")
  @Auditable(
      module = AuditModule.RAG,
      action = AuditAction.QUERY,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<List<RagDocumentResponseDTO>> listDocuments(
      @PathVariable Long kbId, @AuthenticationPrincipal UserDO currentUser) {
    return ApiResponseDTO.success(ragService.listDocuments(kbId, currentUser));
  }

  @PostMapping("/knowledge-bases/{kbId}/documents")
  @Auditable(
      module = AuditModule.RAG,
      action = AuditAction.UPLOAD_DOCUMENT,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<RagDocumentResponseDTO> uploadDocument(
      @PathVariable Long kbId,
      @RequestParam("file") MultipartFile file,
      @AuthenticationPrincipal @Nullable UserDO currentUser) {
    return ApiResponseDTO.success(ragService.uploadDocument(kbId, file, currentUser));
  }

  @DeleteMapping("/documents/{id}")
  @Auditable(
      module = AuditModule.RAG,
      action = AuditAction.DELETE_DOCUMENT,
      logRequestParams = true,
      logResponseData = false)
  public ApiResponseDTO<Void> deleteDocument(
      @PathVariable Long id, @AuthenticationPrincipal UserDO currentUser) {
    ragService.deleteDocument(id, currentUser);
    return ApiResponseDTO.success();
  }
}
