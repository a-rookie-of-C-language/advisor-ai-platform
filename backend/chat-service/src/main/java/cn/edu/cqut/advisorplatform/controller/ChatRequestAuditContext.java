package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class ChatRequestAuditContext {

  private static final String TRACE_HEADER = "X-Trace-Id";

  String resolveTraceIdFromRequest() {
    HttpServletRequest request = currentRequest();
    return LogTraceUtil.resolveTraceId(request == null ? null : request.getHeader(TRACE_HEADER));
  }

  void attach(String traceId, Long sessionId, String turnId) {
    HttpServletRequest request = currentRequest();
    if (request == null) {
      return;
    }
    if (traceId != null && !traceId.isBlank()) {
      request.setAttribute("auditTraceId", traceId);
    }
    if (sessionId != null) {
      request.setAttribute("auditSessionId", sessionId);
    }
    if (turnId != null && !turnId.isBlank()) {
      request.setAttribute("auditTurnId", turnId);
    }
  }

  private HttpServletRequest currentRequest() {
    ServletRequestAttributes attributes =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    if (attributes == null) {
      return null;
    }
    return attributes.getRequest();
  }
}
