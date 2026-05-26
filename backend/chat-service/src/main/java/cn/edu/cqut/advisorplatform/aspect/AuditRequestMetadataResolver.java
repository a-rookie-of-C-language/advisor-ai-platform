package cn.edu.cqut.advisorplatform.aspect;

import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class AuditRequestMetadataResolver {

  HttpServletRequest getHttpServletRequest() {
    ServletRequestAttributes attributes =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    return attributes != null ? attributes.getRequest() : null;
  }

  String getClientIp(HttpServletRequest request) {
    String ip = request.getHeader("X-Forwarded-For");
    if (isBlankOrUnknown(ip)) {
      ip = request.getHeader("Proxy-Client-IP");
    }
    if (isBlankOrUnknown(ip)) {
      ip = request.getHeader("WL-Proxy-Client-IP");
    }
    if (isBlankOrUnknown(ip)) {
      ip = request.getHeader("HTTP_CLIENT_IP");
    }
    if (isBlankOrUnknown(ip)) {
      ip = request.getHeader("HTTP_X_FORWARDED_FOR");
    }
    if (isBlankOrUnknown(ip)) {
      ip = request.getRemoteAddr();
    }
    if (ip != null && ip.contains(",")) {
      ip = ip.split(",")[0].trim();
    }
    return ip;
  }

  String resolveTraceId(HttpServletRequest request) {
    String fromMdc = LogTraceUtil.get(LogTraceUtil.TRACE_ID);
    if (!fromMdc.isBlank()) {
      return fromMdc;
    }
    if (request == null) {
      return "";
    }
    Object attr = request.getAttribute("auditTraceId");
    if (attr instanceof String trace && !trace.isBlank()) {
      return trace;
    }
    String header = request.getHeader("X-Trace-Id");
    return header == null ? "" : header.trim();
  }

  String resolveTurnId(HttpServletRequest request) {
    String fromMdc = LogTraceUtil.get(LogTraceUtil.TURN_ID);
    if (!fromMdc.isBlank()) {
      return fromMdc;
    }
    if (request == null) {
      return "";
    }
    Object attr = request.getAttribute("auditTurnId");
    if (attr instanceof String turn && !turn.isBlank()) {
      return turn;
    }
    String header = request.getHeader("X-Turn-Id");
    return header == null ? "" : header.trim();
  }

  private boolean isBlankOrUnknown(String ip) {
    return ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip);
  }
}
