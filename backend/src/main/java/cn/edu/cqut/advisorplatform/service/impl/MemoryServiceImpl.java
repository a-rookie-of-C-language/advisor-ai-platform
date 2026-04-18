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
import cn.edu.cqut.advisorplatform.service.vector.EmbeddingService;
import cn.edu.cqut.advisorplatform.service.vector.MemoryServiceFactory;
import cn.edu.cqut.advisorplatform.service.vector.MemoryVectorService;
import cn.edu.cqut.advisorplatform.utils.Assert;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryServiceImpl implements MemoryService {

    private final UserMemoryDao userMemoryDao;
    private final SessionSummaryDao sessionSummaryDao;
    private final ChatSessionDao chatSessionDao;
    private final MemoryServiceFactory memoryServiceFactory;
    private final EmbeddingService embeddingService;

    @Value("${advisor.memory.vector-store:pgvector}")
    private String vectorStore;

    @Override
    public List<MemoryItemResponseDTO> searchLongTerm(MemorySearchRequestDTO request) {
        long startedAt = System.currentTimeMillis();
        int topK = request.getTopK() == null ? 6 : Math.max(1, Math.min(request.getTopK(), 50));
        String query = Optional.ofNullable(request.getQuery()).orElse("").trim();
        List<UserMemoryDO> rows;

        if (!query.isEmpty() && memoryServiceFactory.hasService(vectorStore)) {
            try {
                MemoryVectorService vectorService = memoryServiceFactory.getService(vectorStore);
                double[] queryEmbedding = embeddingService.embed(query);
                rows = vectorService.search(request.getUserId(), request.getKbId(), queryEmbedding, topK);
            } catch (Exception exc) {
                log.warn("memory_vector_search_failed userId={}, kbId={}, err={}", request.getUserId(), request.getKbId(), exc.getMessage());
                rows = userMemoryDao.searchByScope(
                        request.getUserId(),
                        request.getKbId(),
                        query,
                        LocalDateTime.now(),
                        PageRequest.of(0, topK)
                );
            }
        } else {
            rows = userMemoryDao.searchByScope(
                    request.getUserId(),
                    request.getKbId(),
                    query,
                    LocalDateTime.now(),
                    PageRequest.of(0, topK)
            );
        }

        log.info(
                "memory_search_done userId={}, kbId={}, topK={}, resultCount={}, elapsedMs={}",
                request.getUserId(),
                request.getKbId(),
                topK,
                rows.size(),
                System.currentTimeMillis() - startedAt
        );

        return rows.stream().map(MemoryItemResponseDTO::from).toList();
    }

    @Override
    @Transactional
    public MemoryCandidateUpsertResponseDTO upsertCandidates(MemoryCandidateUpsertRequestDTO request) {
        long startedAt = System.currentTimeMillis();
        List<MemoryCandidateItemDTO> candidates = request.getCandidates();
        if (candidates == null || candidates.isEmpty()) {
            return MemoryCandidateUpsertResponseDTO.of(0, 0, "no_candidates");
        }

        MemoryVectorService vectorService = memoryServiceFactory.hasService(vectorStore)
                ? memoryServiceFactory.getService(vectorStore)
                : null;

        int accepted = 0;
        int rejected = 0;
        for (MemoryCandidateItemDTO candidate : candidates) {
            if (candidate == null || candidate.getContent() == null || candidate.getContent().trim().isEmpty()) {
                rejected++;
                continue;
            }

            String normalizedContent = candidate.getContent().trim();
            BigDecimal confidence = toDecimal(candidate.getConfidence(), 0.7d, 3);

            try {
                UserMemoryDO row;
                double[] embedding = embeddingService.embed(normalizedContent);
                if (vectorService != null) {
                    Optional<UserMemoryDO> similar = vectorService.findSimilar(
                            request.getUserId(),
                            request.getKbId(),
                            embedding,
                            0.9d
                    );
                    if (similar.isPresent()) {
                        row = similar.get();
                        row.setContent(normalizedContent);
                        row.setConfidence(row.getConfidence().max(confidence));
                        row.setMemoryKey(extractMemoryKey(candidate.getTags()));
                        row.setSourceTurnId(candidate.getSourceTurnId());
                        row.setTags(candidate.getTags() == null ? new HashMap<>() : candidate.getTags());
                        row.setUpdatedAt(LocalDateTime.now());
                        row = userMemoryDao.save(row);
                        vectorService.updateEmbedding(row.getId(), embedding);
                        accepted++;
                        continue;
                    }
                }

                row = new UserMemoryDO();
                row.setUserId(request.getUserId());
                row.setKbId(request.getKbId());
                row.setContent(normalizedContent);
                row.setConfidence(confidence);
                row.setScore(BigDecimal.ZERO.setScale(4));
                row.setMemoryKey(extractMemoryKey(candidate.getTags()));
                row.setSourceTurnId(candidate.getSourceTurnId());
                row.setTags(candidate.getTags() == null ? new HashMap<>() : candidate.getTags());
                row.setIsDeleted(false);
                row.setCreatedAt(LocalDateTime.now());
                row.setUpdatedAt(LocalDateTime.now());
                row = userMemoryDao.save(row);
                if (vectorService != null) {
                    vectorService.updateEmbedding(row.getId(), embedding);
                }
                accepted++;
            } catch (Exception exc) {
                log.warn("memory_write_failed userId={}, kbId={}, err={}", request.getUserId(), request.getKbId(), exc.getMessage());
                rejected++;
            }
        }

        log.info(
                "memory_write_done userId={}, kbId={}, accepted={}, rejected={}, elapsedMs={}",
                request.getUserId(),
                request.getKbId(),
                accepted,
                rejected,
                System.currentTimeMillis() - startedAt
        );

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
