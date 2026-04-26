package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemoryTaskSubmitDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryItemResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryTaskResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.service.MemoryService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
  public ApiResponseDTO<List<MemoryItemResponseDTO>> searchLongTerm(
      @Valid @RequestBody MemorySearchRequestDTO request) {
    return ApiResponseDTO.success(memoryService.searchLongTerm(request));
  }

  @PostMapping("/long-term/candidates")
  public ApiResponseDTO<MemoryCandidateUpsertResponseDTO> upsertCandidates(
      @Valid @RequestBody MemoryCandidateUpsertRequestDTO request) {
    return ApiResponseDTO.success(memoryService.upsertCandidates(request));
  }

  @GetMapping("/session-summary/{sessionId}")
  public ApiResponseDTO<SessionSummaryResponseDTO> getSessionSummary(@PathVariable Long sessionId) {
    return ApiResponseDTO.success(memoryService.getSessionSummary(sessionId));
  }

  @PutMapping("/session-summary/{sessionId}")
  public ApiResponseDTO<Void> saveSessionSummary(
      @PathVariable Long sessionId, @Valid @RequestBody SessionSummaryUpdateRequestDTO request) {
    memoryService.saveSessionSummary(sessionId, request);
    return ApiResponseDTO.success();
  }

  @PostMapping("/cleanup")
  public ApiResponseDTO<Map<String, Integer>> cleanupExpired() {
    return ApiResponseDTO.success(memoryService.cleanupExpiredMemories());
  }

  @PostMapping("/task/submit")
  public ApiResponseDTO<MemoryTaskResponseDTO> submitTask(
      @Valid @RequestBody MemoryTaskSubmitDTO request) {
    return ApiResponseDTO.success(memoryService.submitTask(request));
  }

  @GetMapping("/task/pending")
  public ApiResponseDTO<List<MemoryTaskResponseDTO>> fetchPendingTasks(
      @RequestParam(defaultValue = "10") int limit) {
    return ApiResponseDTO.success(memoryService.fetchPendingTasks(limit));
  }

  @PostMapping("/task/{id}/done")
  public ApiResponseDTO<Void> markTaskDone(@PathVariable Long id) {
    memoryService.markTaskDone(id);
    return ApiResponseDTO.success();
  }

  @PostMapping("/task/{id}/fail")
  public ApiResponseDTO<Void> markTaskFailed(
      @PathVariable Long id, @RequestParam(required = false) String error) {
    memoryService.markTaskFailed(id, error);
    return ApiResponseDTO.success();
  }
}
