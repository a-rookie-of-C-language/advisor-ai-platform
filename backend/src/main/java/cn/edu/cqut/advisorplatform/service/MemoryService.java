package cn.edu.cqut.advisorplatform.service;

import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryItemResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;

import java.util.List;
import java.util.Map;

public interface MemoryService {

    List<MemoryItemResponseDTO> searchLongTerm(MemorySearchRequestDTO request);

    MemoryCandidateUpsertResponseDTO upsertCandidates(MemoryCandidateUpsertRequestDTO request);

    SessionSummaryResponseDTO getSessionSummary(Long sessionId);

    void saveSessionSummary(Long sessionId, SessionSummaryUpdateRequestDTO request);

    void healthCheck();

    Map<String, Integer> cleanupExpiredMemories();
}
