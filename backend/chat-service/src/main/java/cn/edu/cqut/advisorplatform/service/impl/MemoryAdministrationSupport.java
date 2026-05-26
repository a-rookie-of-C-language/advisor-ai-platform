package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.request.MemoryTaskSubmitDTO;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.MemoryTaskResponseDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MemoryAdministrationSupport {

  private final MemorySessionSummarySupport sessionSummarySupport;
  private final MemoryRetentionCleanupSupport cleanupSupport;
  private final MemoryTaskQueueSupport taskQueueSupport;

  public SessionSummaryResponseDTO getSessionSummary(Long sessionId) {
    return sessionSummarySupport.getSessionSummary(sessionId);
  }

  public void saveSessionSummary(Long sessionId, SessionSummaryUpdateRequestDTO request) {
    sessionSummarySupport.saveSessionSummary(sessionId, request);
  }

  public MemoryTaskResponseDTO submitTask(MemoryTaskSubmitDTO request) {
    return taskQueueSupport.submitTask(request);
  }

  public List<MemoryTaskResponseDTO> fetchPendingTasks(int limit) {
    return taskQueueSupport.fetchPendingTasks(limit);
  }

  public void markTaskDone(Long taskId) {
    taskQueueSupport.markTaskDone(taskId);
  }

  public void markTaskFailed(Long taskId, String error) {
    taskQueueSupport.markTaskFailed(taskId, error);
  }

  public Map<String, Integer> cleanupExpiredMemories() {
    return cleanupSupport.cleanupExpiredMemories();
  }
}
