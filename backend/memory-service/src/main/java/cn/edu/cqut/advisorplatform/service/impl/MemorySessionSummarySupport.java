package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dto.request.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.memoryservice.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.memoryservice.dao.SessionSummaryDao;
import cn.edu.cqut.advisorplatform.memoryservice.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.memoryservice.entity.SessionSummaryDO;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MemorySessionSummarySupport {

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
        sessionSummaryDao.findBySessionId(sessionId).orElseGet(() -> createSummary(session));

    if (summary.getId() != null) {
      summary.setVersion(summary.getVersion() + 1);
    }
    summary.setSummary(request.getSummary().trim());
    summary.setUpdatedAt(LocalDateTime.now());
    sessionSummaryDao.save(summary);
  }

  private SessionSummaryDO createSummary(ChatSessionDO session) {
    SessionSummaryDO row = new SessionSummaryDO();
    row.setSession(session);
    row.setVersion(1);
    row.setCreatedAt(LocalDateTime.now());
    return row;
  }
}
