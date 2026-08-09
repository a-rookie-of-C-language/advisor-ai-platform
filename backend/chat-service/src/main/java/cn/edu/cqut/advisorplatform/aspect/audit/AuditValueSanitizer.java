package cn.edu.cqut.advisorplatform.aspect.audit;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

class AuditValueSanitizer {

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

  Object sanitizeValue(String key, Object value) {
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
      return listValue.stream()
          .limit(20)
          .map(item -> item == null ? null : sanitizeValue(key, item))
          .toList();
    }
    if (value instanceof byte[] || value.getClass().isArray()) {
      return "[binary data]";
    }
    return value.getClass().getSimpleName();
  }

  boolean isExcludedType(Class<?> type) {
    return type.getName().startsWith("org.springframework")
        || type.getName().startsWith("jakarta.servlet")
        || type.getName().startsWith("org.hibernate");
  }

  String truncate(String value) {
    if (value == null || value.length() <= MAX_TEXT_LENGTH) {
      return value;
    }
    return value.substring(0, MAX_TEXT_LENGTH) + "...[truncated]";
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
}
