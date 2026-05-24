package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.MemoryTaskDao;
import cn.edu.cqut.advisorplatform.dao.SessionSummaryDao;
import cn.edu.cqut.advisorplatform.dao.UserMemoryDao;
import cn.edu.cqut.advisorplatform.dto.request.MemoryTaskSubmitDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryTaskResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.MemoryTaskDO;
import cn.edu.cqut.advisorplatform.entity.SessionSummaryDO;
import cn.edu.cqut.advisorplatform.entity.UserMemoryDO;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemoryAdministrationSupport {

  private final UserMemoryDao userMemoryDao;
  private final MemoryTaskDao memoryTaskDao;
  private final SessionSummaryDao sessionSummaryDao;
  private final ChatSessionDao chatSessionDao;

  public SessionSummaryResponseDTO getSessionSummary(Long sessionId) {
    chatSessionDao
        .findById(sessionId)
        .orElseThrow(() -> new NotFoundException("session not found"));
    return sessionSummaryDao
        .findBySessionId(sessionId)
        .map(SessionSummaryResponseDTO::from)
        .orElse(null);
  }

  public void saveSessionSummary(Long sessionId, SessionSummaryUpdateRequestDTO request) {
    Assert.notBlank(request.getSummary(), () -> new BadRequestException("summary is blank"));

    ChatSessionDO session =
        chatSessionDao
            .findById(sessionId)
            .orElseThrow(() -> new NotFoundException("session not found"));

    SessionSummaryDO summary =
        sessionSummaryDao
            .findBySessionId(sessionId)
            .orElseGet(
                () -> {
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

  public MemoryTaskResponseDTO submitTask(MemoryTaskSubmitDTO request) {
    var existing =
        memoryTaskDao.findBySessionIdAndTurnId(request.getSessionId(), request.getTurnId());
    if (existing.isPresent()) {
      return MemoryTaskResponseDTO.from(existing.get());
    }
    var task = new MemoryTaskDO();
    task.setUserId(request.getUserId());
    task.setKbId(request.getKbId());
    task.setSessionId(request.getSessionId());
    task.setTurnId(request.getTurnId());
    task.setStatus("pending");
    Map<String, Object> payload = new HashMap<>();
    if (request.getUserText() != null) {
      payload.put("user_text", request.getUserText());
    }
    if (request.getAssistantText() != null) {
      payload.put("assistant_text", request.getAssistantText());
    }
    if (request.getRecentMessages() != null) {
      payload.put("recent_messages", request.getRecentMessages());
    }
    task.setPayload(payload);
    task.setRetryCount(0);
    task.setCreatedAt(LocalDateTime.now());
    return MemoryTaskResponseDTO.from(memoryTaskDao.save(task));
  }

  public List<MemoryTaskResponseDTO> fetchPendingTasks(int limit) {
    int safeLimit = Math.max(1, Math.min(limit, 50));
    List<MemoryTaskDO> tasks = memoryTaskDao.findPendingTasks(3, PageRequest.of(0, safeLimit));
    for (MemoryTaskDO task : tasks) {
      memoryTaskDao.updateStatus(task.getId(), "processing");
    }
    return tasks.stream().map(MemoryTaskResponseDTO::from).toList();
  }

  public void markTaskDone(Long taskId) {
    memoryTaskDao.updateStatus(taskId, "done");
  }

  public void markTaskFailed(Long taskId, String error) {
    memoryTaskDao.markFailed(taskId, error != null ? error : "unknown", LocalDateTime.now());
  }

  public Map<String, Integer> cleanupExpiredMemories() {
    int softDeleted = 0;
    int lowConfidence = 0;

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime softDeleteCutoff = now.minusDays(30);
    LocalDateTime staleCutoff = now.minusDays(90);

    List<UserMemoryDO> softDeletedRows = userMemoryDao.findSoftDeletedBefore(softDeleteCutoff);
    if (!softDeletedRows.isEmpty()) {
      List<Long> ids = softDeletedRows.stream().map(UserMemoryDO::getId).toList();
      userMemoryDao.deleteAllByIdInBatch(ids);
      softDeleted = ids.size();
    }

    List<UserMemoryDO> staleRows =
        userMemoryDao.findLowConfidenceStale(
            BigDecimal.valueOf(0.3), staleCutoff, PageRequest.of(0, 200));
    if (!staleRows.isEmpty()) {
      List<Long> ids = staleRows.stream().map(UserMemoryDO::getId).toList();
      userMemoryDao.deleteAllByIdInBatch(ids);
      lowConfidence = ids.size();
    }

    log.info("memory_cleanup_done soft_deleted={}, low_confidence={}", softDeleted, lowConfidence);
    return Map.of("soft_deleted", softDeleted, "low_confidence", lowConfidence);
  }
}
