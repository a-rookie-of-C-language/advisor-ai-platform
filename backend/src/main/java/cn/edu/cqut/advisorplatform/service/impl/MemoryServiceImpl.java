package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.SessionSummaryDao;
import cn.edu.cqut.advisorplatform.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateItemDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemoryCandidateUpsertRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.MemorySearchRequestDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryCandidateUpsertResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryItemResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.SessionSummaryDO;
import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.service.MemoryService;
import cn.edu.cqut.advisorplatform.utils.Assert;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

    private final UserMemoryDao userMemoryDao;
    private final SessionSummaryDao sessionSummaryDao;
    private final ChatSessionDao chatSessionDao;

    @Override
    public List<MemoryItemResponseDTO> searchLongTerm(MemorySearchRequestDTO request) {
        int topK = request.getTopK() == null ? 6 : Math.max(1, Math.min(request.getTopK(), 50));
        String query = Optional.ofNullable(request.getQuery()).orElse("").trim();

        List<UserMemoryDO> rows = userMemoryDao.searchByScope(
                request.getUserId(),
                request.getKbId(),
                query,
                LocalDateTime.now(),
                PageRequest.of(0, topK)
        );

        return rows.stream().map(MemoryItemResponseDTO::from).toList();
    }

    @Override
    @Transactional
    public MemoryCandidateUpsertResponseDTO upsertCandidates(MemoryCandidateUpsertRequestDTO request) {
        List<MemoryCandidateItemDTO> candidates = request.getCandidates();
        if (candidates == null || candidates.isEmpty()) {
            return MemoryCandidateUpsertResponseDTO.of(0, 0, "no_candidates");
        }

        int accepted = 0;
        int rejected = 0;
        for (MemoryCandidateItemDTO candidate : candidates) {
            if (candidate == null || candidate.getContent() == null || candidate.getContent().trim().isEmpty()) {
                rejected++;
                continue;
            }

            UserMemoryDO row = new UserMemoryDO();
            row.setUserId(request.getUserId());
            row.setKbId(request.getKbId());
            row.setContent(candidate.getContent().trim());
            row.setConfidence(toDecimal(candidate.getConfidence(), 0.7d, 3));
            row.setScore(BigDecimal.ZERO.setScale(4));
            row.setMemoryKey(extractMemoryKey(candidate.getTags()));
            row.setSourceTurnId(candidate.getSourceTurnId());
            row.setTags(candidate.getTags() == null ? new HashMap<>() : candidate.getTags());
            row.setIsDeleted(false);
            row.setCreatedAt(LocalDateTime.now());
            row.setUpdatedAt(LocalDateTime.now());
            userMemoryDao.save(row);
            accepted++;
        }

        return MemoryCandidateUpsertResponseDTO.of(accepted, rejected, "ok");
    }

    @Override
    public SessionSummaryResponseDTO getSessionSummary(Long sessionId) {
        chatSessionDao.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("session not found"));

        return sessionSummaryDao.findBySessionId(sessionId)
                .map(SessionSummaryResponseDTO::from)
                .orElse(null);
    }

    @Override
    @Transactional
    public void saveSessionSummary(Long sessionId, SessionSummaryUpdateRequestDTO request) {
        Assert.notBlank(request.getSummary(), () -> new BadRequestException("summary is blank"));

        ChatSessionDO session = chatSessionDao.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("session not found"));

        SessionSummaryDO summary = sessionSummaryDao.findBySessionId(sessionId)
                .orElseGet(() -> {
                    SessionSummaryDO row = new SessionSummaryDO();
                    row.setSession(session);
                    row.setVersion(1);
                    row.setCreatedAt(LocalDateTime.now());
                    return row;
                });

        if (summary.getId() != null) {
            summary.setVersion(summary.getVersion() + 1);
        }
        summary.setSummary(request.getSummary().trim());
        summary.setUpdatedAt(LocalDateTime.now());
        sessionSummaryDao.save(summary);
    }

    @Override
    public void healthCheck() {
        // no-op
    }

    private String extractMemoryKey(Map<String, Object> tags) {
        if (tags == null) {
            return null;
        }
        Object raw = tags.get("memory_key");
        if (raw == null) {
            return null;
        }
        String value = String.valueOf(raw).trim();
        return value.isEmpty() ? null : value;
    }

    private BigDecimal toDecimal(Double value, double fallback, int scale) {
        double safe = value == null ? fallback : Math.max(0d, Math.min(1d, value));
        return BigDecimal.valueOf(safe).setScale(scale, java.math.RoundingMode.HALF_UP);
    }
}
