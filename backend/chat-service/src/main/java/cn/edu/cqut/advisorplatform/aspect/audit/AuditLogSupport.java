package cn.edu.cqut.advisorplatform.aspect.audit;

import cn.edu.cqut.advisorplatform.common.security.UserPrincipal;
import cn.edu.cqut.advisorplatform.entity.audit.AuditAction;
import cn.edu.cqut.advisorplatform.entity.audit.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.audit.AuditModule;
import cn.edu.cqut.advisorplatform.service.audit.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AuditLogSupport {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private final AuditService auditService;

  private final AuditValueSanitizer valueSanitizer = new AuditValueSanitizer();
  private final AuditContextResolver contextResolver = new AuditContextResolver();

  public AuditLogSupport(@Qualifier("remoteAuditServiceImpl") AuditService auditService) {
    this.auditService = auditService;
  }

  public void saveAuditLog(
      ProceedingJoinPoint joinPoint,
      MethodSignature signature,
      Method method,
      AuditModule module,
      AuditAction action,
      boolean logParams,
      boolean logResponse,
      String description,
      long duration,
      Object result,
      Throwable exception) {
    try {
      AuditLogDO auditLog = new AuditLogDO();
      auditLog.setModule(module);
      auditLog.setAction(action);
      auditLog.setMethod(method.getDeclaringClass().getSimpleName() + "." + method.getName());
      auditLog.setCreatedAt(LocalDateTime.now());
      auditLog.setDurationMs(duration);
      auditLog.setDescription(valueSanitizer.truncate(description));

      UserPrincipal currentUser = contextResolver.getCurrentUser();
      if (currentUser != null) {
        auditLog.setUserId(currentUser.getId());
        auditLog.setUsername(currentUser.getUsername());
      }

      HttpServletRequest request = contextResolver.getHttpServletRequest();
      if (request != null) {
        auditLog.setRequestUri(request.getRequestURI());
        auditLog.setIpAddress(contextResolver.getClientIp(request));
        auditLog.setUserAgent(request.getHeader("User-Agent"));
        if (logParams) {
          auditLog.setRequestParams(extractParams(joinPoint, method));
        }
      }
      auditLog.setTraceId(contextResolver.resolveTraceId(request));
      auditLog.setSessionId(contextResolver.resolveSessionId(joinPoint, signature, request));
      auditLog.setTurnId(contextResolver.resolveTurnId(request));

      if (exception != null) {
        auditLog.setResponseStatus("FAILED");
        auditLog.setErrorMessage(
            exception.getClass().getSimpleName() + ": " + exception.getMessage());
      } else {
        auditLog.setResponseStatus("SUCCESS");
      }

      if (logResponse && result != null) {
        auditLog.setResponseData(serializeToJson(result));
      }

      auditService.saveAuditLogAsync(auditLog);
    } catch (Exception e) {
      log.error("Failed to save audit log", e);
    }
  }

  private String extractParams(ProceedingJoinPoint joinPoint, Method method) {
    try {
      Map<String, Object> params = new LinkedHashMap<>();
      Parameter[] parameters = method.getParameters();
      Object[] args = joinPoint.getArgs();

      for (int i = 0; i < parameters.length; i++) {
        if (i < args.length
            && args[i] != null
            && !valueSanitizer.isExcludedType(args[i].getClass())) {
          String paramName = parameters[i].getName();
          params.put(paramName, valueSanitizer.sanitizeValue(paramName, args[i]));
        }
      }
      return serializeToJson(params);
    } catch (Exception e) {
      log.warn("Failed to extract request parameters", e);
      return "{}";
    }
  }

  private String serializeToJson(Object obj) {
    try {
      return OBJECT_MAPPER.writeValueAsString(obj);
    } catch (Exception e) {
      log.warn("Failed to serialize object to JSON", e);
      return "{}";
    }
  }
}
