package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.service.RagService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

  private final RagService ragService;

  @GetMapping("/knowledge-bases")
  public ApiResponseDTO<List<KnowledgeBaseResponseDTO>> listKnowledgeBases(
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    return ApiResponseDTO.success(ragService.listKnowledgeBases(currentUser));
  }

  @PostMapping("/knowledge-bases")
  public ApiResponseDTO<KnowledgeBaseResponseDTO> createKnowledgeBase(
      @RequestBody Map<String, String> body,
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    return ApiResponseDTO.success(
        ragService.createKnowledgeBase(body.get("name"), body.get("description"), currentUser));
  }

  @DeleteMapping("/knowledge-bases/{id}")
  public ApiResponseDTO<Void> deleteKnowledgeBase(
      @PathVariable("id") Long id, @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    ragService.deleteKnowledgeBase(id, currentUser);
    return ApiResponseDTO.success();
  }

  @GetMapping("/knowledge-bases/{knowledgeBaseId}/documents")
  public ApiResponseDTO<List<RagDocumentResponseDTO>> listDocuments(
      @PathVariable("knowledgeBaseId") Long knowledgeBaseId,
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    return ApiResponseDTO.success(ragService.listDocuments(knowledgeBaseId, currentUser));
  }

  @PostMapping("/knowledge-bases/{knowledgeBaseId}/documents")
  public ApiResponseDTO<RagDocumentResponseDTO> uploadDocument(
      @PathVariable("knowledgeBaseId") Long knowledgeBaseId,
      @RequestParam("file") MultipartFile file,
      @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    return ApiResponseDTO.success(ragService.uploadDocument(knowledgeBaseId, file, currentUser));
  }

  @DeleteMapping("/documents/{id}")
  public ApiResponseDTO<Void> deleteDocument(
      @PathVariable("id") Long id, @AuthenticationPrincipal @Nullable UserPrincipal currentUser) {
    ragService.deleteDocument(id, currentUser);
    return ApiResponseDTO.success();
  }
}
