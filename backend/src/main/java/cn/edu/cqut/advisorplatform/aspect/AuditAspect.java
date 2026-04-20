package cn.edu.cqut.advisorplatform.aspect;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditAction;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO.AuditModule;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.service.AuditService;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private static final String MASKED_VALUE = "***";
    private static final int MAX_TEXT_LENGTH = 1000;
    private static final String[] SENSITIVE_KEYS = {
            "password",
            "token",
            "secret",
            "apikey",
            "api_key",
            "accesskey",
            "access_key",
            "refreshtoken",
            "refresh_token",
            "idtoken",
            "id_token",
            "clientsecret",
            "client_secret",
            "authorization"
    };
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
            auditLog.setDescription(truncate(description));

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
            auditLog.setTraceId(resolveTraceId(request));
            auditLog.setSessionId(resolveSessionId(joinPoint, signature, request));
            auditLog.setTurnId(resolveTurnId(request));

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
            Map<String, Object> params = new LinkedHashMap<>();
            Parameter[] parameters = method.getParameters();
            Object[] args = joinPoint.getArgs();

            for (int i = 0; i < parameters.length; i++) {
                if (i < args.length && args[i] != null && !isExcludedType(args[i].getClass())) {
                    String paramName = parameters[i].getName();
                    params.put(paramName, sanitizeValue(paramName, args[i]));
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

    private Object sanitizeValue(String key, Object value) {
        if (isSensitiveKey(key)) {
            return MASKED_VALUE;
        }
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            return truncate(value.toString());
        }
        if (value instanceof Map<?, ?> mapValue) {
            Map<String, Object> sanitized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : mapValue.entrySet()) {
                String entryKey = String.valueOf(entry.getKey());
                Object entryValue = entry.getValue();
                if (entryValue == null) {
                    sanitized.put(entryKey, null);
                    continue;
                }
                if (isExcludedType(entryValue.getClass())) {
                    continue;
                }
                sanitized.put(entryKey, sanitizeValue(entryKey, entryValue));
            }
            return sanitized;
        }
        if (value instanceof List<?> listValue) {
            return listValue.stream().limit(20).map(item -> item == null ? null : sanitizeValue(key, item)).toList();
        }
        if (value instanceof byte[] || value.getClass().isArray()) {
            return "[binary data]";
        }
        return value.getClass().getSimpleName();
    }

    private boolean isSensitiveKey(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.toLowerCase(Locale.ROOT);
        for (String sensitive : SENSITIVE_KEYS) {
            if (normalized.contains(sensitive)) {
                return true;
            }
        }
        return false;
    }

    private String resolveTraceId(HttpServletRequest request) {
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

    private Long resolveSessionId(
            ProceedingJoinPoint joinPoint,
            MethodSignature signature,
            HttpServletRequest request
    ) {
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
            String name = parameterNames[i];
            Object arg = args[i];
            if (arg == null || name == null) {
                continue;
            }
            String lowered = name.toLowerCase(Locale.ROOT);
            if ("sessionid".equals(lowered) || "id".equals(lowered) && request != null && request.getRequestURI().contains("/sessions/")) {
                Long parsed = parseLong(String.valueOf(arg));
                if (parsed != null) {
                    return parsed;
                }
            }
        }
        return null;
    }

    private String resolveTurnId(HttpServletRequest request) {
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

    private String truncate(String value) {
        if (value == null || value.length() <= MAX_TEXT_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_TEXT_LENGTH) + "...[truncated]";
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
