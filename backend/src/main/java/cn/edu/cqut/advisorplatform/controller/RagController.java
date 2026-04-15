package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.RagService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    // ── 知识库 ──

    @GetMapping("/knowledge-bases")
    public ApiResponseDTO<List<KnowledgeBaseResponseDTO>> listKnowledgeBases(
            @AuthenticationPrincipal UserDO currentUser) {
        return ApiResponseDTO.success(ragService.listKnowledgeBases(currentUser));
    }

    @PostMapping("/knowledge-bases")
    public ApiResponseDTO<KnowledgeBaseResponseDTO> createKnowledgeBase(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDO currentUser) {
        return ApiResponseDTO.success(ragService.createKnowledgeBase(
                body.get("name"), body.get("description"), currentUser));
    }

    @DeleteMapping("/knowledge-bases/{id}")
    public ApiResponseDTO<Void> deleteKnowledgeBase(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDO currentUser) {
        ragService.deleteKnowledgeBase(id, currentUser);
        return ApiResponseDTO.success();
    }

    // ── 文档 ──

    @GetMapping("/knowledge-bases/{kbId}/documents")
    public ApiResponseDTO<List<RagDocumentResponseDTO>> listDocuments(
            @PathVariable Long kbId,
            @AuthenticationPrincipal UserDO currentUser) {
        return ApiResponseDTO.success(ragService.listDocuments(kbId, currentUser));
    }

    @PostMapping("/knowledge-bases/{kbId}/documents")
    public ApiResponseDTO<RagDocumentResponseDTO> uploadDocument(
            @PathVariable Long kbId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDO currentUser) {
        return ApiResponseDTO.success(ragService.uploadDocument(kbId, file, currentUser));
    }

    @DeleteMapping("/documents/{id}")
    public ApiResponseDTO<Void> deleteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDO currentUser) {
        ragService.deleteDocument(id, currentUser);
        return ApiResponseDTO.success();
    }
}
