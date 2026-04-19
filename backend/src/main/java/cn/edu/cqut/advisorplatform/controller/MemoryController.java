package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryItemResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.service.MemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/memory")
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;

    @GetMapping("/health")
    public ApiResponseDTO<Map<String, Object>> health() {
        memoryService.healthCheck();
        return ApiResponseDTO.success(Map.of("ok", true));
    }

    @PostMapping("/long-term/search")
    @Auditable(module = AuditLogDO.AuditModule.MEMORY, action = AuditLogDO.AuditAction.SEARCH, logRequestParams = true, logResponseData = false)
    public ApiResponseDTO<List<MemoryItemResponseDTO>> searchLongTerm(@Valid @RequestBody MemorySearchRequestDTO request) {
        return ApiResponseDTO.success(memoryService.searchLongTerm(request));
    }

    @PostMapping("/long-term/candidates")
    @Auditable(module = AuditLogDO.AuditModule.MEMORY, action = AuditLogDO.AuditAction.STORE, logRequestParams = true, logResponseData = false)
    public ApiResponseDTO<MemoryCandidateUpsertResponseDTO> upsertCandidates(
            @Valid @RequestBody MemoryCandidateUpsertRequestDTO request) {
        return ApiResponseDTO.success(memoryService.upsertCandidates(request));
    }

    @GetMapping("/session-summary/{sessionId}")
    @Auditable(module = AuditLogDO.AuditModule.MEMORY, action = AuditLogDO.AuditAction.RETRIEVE, logRequestParams = true, logResponseData = false)
    public ApiResponseDTO<SessionSummaryResponseDTO> getSessionSummary(@PathVariable Long sessionId) {
        return ApiResponseDTO.success(memoryService.getSessionSummary(sessionId));
    }

    @PutMapping("/session-summary/{sessionId}")
    @Auditable(module = AuditLogDO.AuditModule.MEMORY, action = AuditLogDO.AuditAction.UPDATE, logRequestParams = true, logResponseData = false)
    public ApiResponseDTO<Void> saveSessionSummary(
            @PathVariable Long sessionId,
            @Valid @RequestBody SessionSummaryUpdateRequestDTO request) {
        memoryService.saveSessionSummary(sessionId, request);
        return ApiResponseDTO.success();
    }

    @PostMapping("/cleanup")
    public ApiResponseDTO<Map<String, Integer>> cleanupExpired() {
        return ApiResponseDTO.success(memoryService.cleanupExpiredMemories());
    }
}
