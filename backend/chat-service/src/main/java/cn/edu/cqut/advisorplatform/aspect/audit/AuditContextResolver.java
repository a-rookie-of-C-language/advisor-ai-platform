package cn.edu.cqut.advisorplatform.aspect.audit;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.entity.user.UserDO;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

class AuditContextResolver {

  private final AuditRequestMetadataResolver requestMetadataResolver =
      new AuditRequestMetadataResolver();

  UserPrincipal getCurrentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null) {
      return null;
    }

    Object principal = authentication.getPrincipal();
    if (principal instanceof UserPrincipal userPrincipal) {
      return userPrincipal;
    }
    if (principal instanceof UserDO userDo) {
      String role = userDo.getRole() == null ? "ADVISOR" : userDo.getRole().name();
      return new UserPrincipal(userDo.getId(), userDo.getUsername(), role);
    }

    return null;
  }

  HttpServletRequest getHttpServletRequest() {
    return requestMetadataResolver.getHttpServletRequest();
  }

  String getClientIp(HttpServletRequest request) {
    return requestMetadataResolver.getClientIp(request);
  }

  String resolveTraceId(HttpServletRequest request) {
    return requestMetadataResolver.resolveTraceId(request);
  }

  Long resolveSessionId(
      ProceedingJoinPoint joinPoint, MethodSignature signature, HttpServletRequest request) {
    String fromMdc = LogTraceUtil.get(LogTraceUtil.SESSION_ID);
    Long parsedMdc = parseLong(fromMdc);
    if (parsedMdc != null) {
      return parsedMdc;
    }

    if (request != null) {
      Object attr = request.getAttribute("auditSessionId");
      Long parsedAttr = parseLong(attr == null ? null : String.valueOf(attr));
      if (parsedAttr != null) {
        return parsedAttr;
      }
    }

    Object[] args = joinPoint.getArgs();
    String[] parameterNames = signature.getParameterNames();
    if (args == null || parameterNames == null) {
      return null;
    }
    for (int i = 0; i < args.length && i < parameterNames.length; i++) {
      Long parsed = parseSessionArgument(parameterNames[i], args[i], request);
      if (parsed != null) {
        return parsed;
      }
    }
    return null;
  }

  String resolveTurnId(HttpServletRequest request) {
    return requestMetadataResolver.resolveTurnId(request);
  }

  private Long parseSessionArgument(String name, Object arg, HttpServletRequest request) {
    if (arg == null || name == null) {
      return null;
    }
    String lowered = name.toLowerCase(Locale.ROOT);
    if ("sessionid".equals(lowered)
        || "id".equals(lowered)
            && request != null
            && request.getRequestURI().contains("/sessions/")) {
      return parseLong(String.valueOf(arg));
    }
    return null;
  }

  private Long parseLong(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(raw.trim());
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
