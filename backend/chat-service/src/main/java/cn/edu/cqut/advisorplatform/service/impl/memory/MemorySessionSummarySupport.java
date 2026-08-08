package cn.edu.cqut.advisorplatform.service.impl.memory;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.common.exception.NotFoundException;
import cn.edu.cqut.advisorplatform.dao.ChatSessionDao;
import cn.edu.cqut.advisorplatform.dao.SessionSummaryDao;
import cn.edu.cqut.advisorplatform.dto.request.memory.SessionSummaryUpdateRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.memory.SessionSummaryResponseDTO;
import cn.edu.cqut.advisorplatform.entity.ChatSessionDO;
import cn.edu.cqut.advisorplatform.entity.SessionSummaryDO;
import cn.edu.cqut.advisorplatform.utils.Assert;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MemorySessionSummarySupport {

  private final SessionSummaryDao sessionSummaryDao;
  private final ChatSessionDao chatSessionDao;

  SessionSummaryResponseDTO getSessionSummary(Long sessionId) {
    requireSession(sessionId);
    return sessionSummaryDao
        .findBySessionId(sessionId)
        .map(SessionSummaryResponseDTO::from)
        .orElse(null);
  }

  void saveSessionSummary(Long sessionId, SessionSummaryUpdateRequestDTO request) {
    Assert.notBlank(request.getSummary(), () -> new BadRequestException("summary is blank"));

    ChatSessionDO session = requireSession(sessionId);
    SessionSummaryDO summary =
        sessionSummaryDao.findBySessionId(sessionId).orElseGet(() -> createSummary(session));

    if (summary.getId() != null) {
      summary.setVersion(summary.getVersion() + 1);
    }
    summary.setSummary(request.getSummary().trim());
    summary.setUpdatedAt(LocalDateTime.now());
    sessionSummaryDao.save(summary);
  }

  private ChatSessionDO requireSession(Long sessionId) {
    return chatSessionDao
        .findById(sessionId)
        .orElseThrow(() -> new NotFoundException("session not found"));
  }

  private SessionSummaryDO createSummary(ChatSessionDO session) {
    SessionSummaryDO row = new SessionSummaryDO();
    row.setSession(session);
    row.setVersion(1);
    row.setCreatedAt(LocalDateTime.now());
    return row;
  }
}
