package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import cn.edu.cqut.advisorplatform.dto.response.KnowledgeBaseResponse;
import cn.edu.cqut.advisorplatform.dto.response.RagDocumentResponse;
import cn.edu.cqut.advisorplatform.entity.User;
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
    public ApiResponse<List<KnowledgeBaseResponse>> listKnowledgeBases(
            @AuthenticationPrincipal User currentUser) {
        return ApiResponse.success(ragService.listKnowledgeBases(currentUser));
    }

    @PostMapping("/knowledge-bases")
    public ApiResponse<KnowledgeBaseResponse> createKnowledgeBase(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        return ApiResponse.success(ragService.createKnowledgeBase(
                body.get("name"), body.get("description"), currentUser));
    }

    @DeleteMapping("/knowledge-bases/{id}")
    public ApiResponse<Void> deleteKnowledgeBase(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        ragService.deleteKnowledgeBase(id, currentUser);
        return ApiResponse.success();
    }

    // ── 文档 ──

    @GetMapping("/knowledge-bases/{kbId}/documents")
    public ApiResponse<List<RagDocumentResponse>> listDocuments(
            @PathVariable Long kbId,
            @AuthenticationPrincipal User currentUser) {
        return ApiResponse.success(ragService.listDocuments(kbId, currentUser));
    }

    @PostMapping("/knowledge-bases/{kbId}/documents")
    public ApiResponse<RagDocumentResponse> uploadDocument(
            @PathVariable Long kbId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        return ApiResponse.success(ragService.uploadDocument(kbId, file, currentUser));
    }

    @DeleteMapping("/documents/{id}")
    public ApiResponse<Void> deleteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        ragService.deleteDocument(id, currentUser);
        return ApiResponse.success();
    }
}
