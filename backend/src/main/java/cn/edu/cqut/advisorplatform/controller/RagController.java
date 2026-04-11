package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * RAG 知识库管理 Controller（骨架，当前返回 mock 数据）
 * 后续集成 Spring AI + pgvector 时替换为真实实现
 */
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    // ── 知识库 ──

    @GetMapping("/knowledge-bases")
    public ApiResponse<List<Map<String, Object>>> listKnowledgeBases() {
        return ApiResponse.success(List.of(
                Map.of("id", 1, "name", "思政教育资料库", "description", "收录课程思政、红色文化等相关资料", "docCount", 18, "status", "READY"),
                Map.of("id", 2, "name", "学生工作政策库", "description", "汇聚学生工作相关政策文件", "docCount", 14, "status", "READY"),
                Map.of("id", 3, "name", "心理健康指导库", "description", "心理危机干预等指导材料", "docCount", 10, "status", "INDEXING")
        ));
    }

    @PostMapping("/knowledge-bases")
    public ApiResponse<Map<String, Object>> createKnowledgeBase(@RequestBody Map<String, String> body) {
        return ApiResponse.success(Map.of(
                "id", System.currentTimeMillis(),
                "name", body.getOrDefault("name", ""),
                "description", body.getOrDefault("description", ""),
                "docCount", 0,
                "status", "READY"
        ));
    }

    @DeleteMapping("/knowledge-bases/{id}")
    public ApiResponse<Void> deleteKnowledgeBase(@PathVariable Long id) {
        return ApiResponse.success();
    }

    // ── 文档 ──

    @GetMapping("/knowledge-bases/{kbId}/documents")
    public ApiResponse<List<Map<String, Object>>> listDocuments(@PathVariable Long kbId) {
        return ApiResponse.success(List.of(
                Map.of("id", 1, "fileName", "2025年思政工作指导意见.pdf", "fileType", "pdf", "fileSize", 1240000, "status", "READY", "createdAt", "2026-04-01 10:23"),
                Map.of("id", 2, "fileName", "红岩精神传承手册.docx", "fileType", "docx", "fileSize", 856000, "status", "READY", "createdAt", "2026-04-02 14:15")
        ));
    }

    @PostMapping("/knowledge-bases/{kbId}/documents")
    public ApiResponse<Map<String, Object>> uploadDocument(
            @PathVariable Long kbId,
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.success(Map.of(
                "id", System.currentTimeMillis(),
                "fileName", file.getOriginalFilename(),
                "fileSize", file.getSize(),
                "status", "INDEXING"
        ));
    }

    @DeleteMapping("/documents/{id}")
    public ApiResponse<Void> deleteDocument(@PathVariable Long id) {
        return ApiResponse.success();
    }
}
