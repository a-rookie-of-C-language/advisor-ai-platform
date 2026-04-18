package cn.edu.cqut.advisorplatform.aspect;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @Around("@annotation(cn.edu.cqut.advisorplatform.annotation.Auditable)")
    public Object audit(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Auditable auditable = method.getAnnotation(Auditable.class);

        AuditModule module = auditable.module();
        AuditAction action = auditable.action();
        boolean logParams = auditable.logRequestParams();
        boolean logResponse = auditable.logResponseData();
        String description = auditable.description();

        long startTime = System.currentTimeMillis();

        Object result = null;
        Throwable exception = null;
        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable e) {
            exception = e;
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            saveAuditLog(joinPoint, signature, method, module, action,
                    logParams, logResponse, description, duration, result, exception);
        }
    }

    private void saveAuditLog(ProceedingJoinPoint joinPoint,
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

            UserDO currentUser = getCurrentUser();
            if (currentUser != null) {
                auditLog.setUserId(currentUser.getId());
                auditLog.setUsername(currentUser.getUsername());
            }

            HttpServletRequest request = getHttpServletRequest();
            if (request != null) {
                auditLog.setRequestUri(request.getRequestURI());
                auditLog.setIpAddress(getClientIp(request));
                auditLog.setUserAgent(request.getHeader("User-Agent"));
                if (logParams) {
                    auditLog.setRequestParams(extractParams(joinPoint, signature, method));
                }
            }

            if (exception != null) {
                auditLog.setResponseStatus("FAILED");
                auditLog.setErrorMessage(exception.getClass().getSimpleName() + ": " + exception.getMessage());
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

    private UserDO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDO) {
            return (UserDO) authentication.getPrincipal();
        }
        return null;
    }

    private HttpServletRequest getHttpServletRequest() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private String extractParams(ProceedingJoinPoint joinPoint,
                                  MethodSignature signature,
                                  Method method) {
        try {
            Map<String, Object> params = new HashMap<>();
            Parameter[] parameters = method.getParameters();
            Object[] args = joinPoint.getArgs();

            for (int i = 0; i < parameters.length; i++) {
                if (args[i] != null && !isExcludedType(args[i].getClass())) {
                    params.put(parameters[i].getName(), sanitizeValue(args[i]));
                }
            }
            return serializeToJson(params);
        } catch (Exception e) {
            log.warn("Failed to extract request parameters", e);
            return "{}";
        }
    }

    private boolean isExcludedType(Class<?> type) {
        return type.getName().startsWith("org.springframework")
                || type.getName().startsWith("jakarta.servlet")
                || type.getName().startsWith("org.hibernate");
    }

    private Object sanitizeValue(Object value) {
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            String strValue = value.toString();
            if (strValue.length() > 1000) {
                return strValue.substring(0, 1000) + "...[truncated]";
            }
            return strValue;
        }
        if (value instanceof byte[] || value.getClass().isArray()) {
            return "[binary data]";
        }
        return value.getClass().getSimpleName();
    }

    private String serializeToJson(Object obj) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(
                    new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Failed to serialize object to JSON", e);
            return "{}";
        }
    }
}
