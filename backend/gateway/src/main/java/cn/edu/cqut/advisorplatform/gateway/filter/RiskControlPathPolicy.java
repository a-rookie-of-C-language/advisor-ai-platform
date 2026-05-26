package cn.edu.cqut.advisorplatform.gateway.filter;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

class RiskControlPathPolicy {

  private static final List<String> RISK_CHECK_PATHS =
      List.of("/api/chat/", "/api/session/", "/api/rag/", "/api/memory/");

  boolean shouldCheck(String path) {
    return RISK_CHECK_PATHS.stream().anyMatch(path::startsWith);
  }

  boolean shouldFailClosed(String path, boolean failOpenDefault, String failClosedPaths) {
    Set<String> paths =
        List.of((failClosedPaths == null ? "" : failClosedPaths).split(",")).stream()
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .collect(Collectors.toSet());
    return paths.stream().anyMatch(path::startsWith) || !failOpenDefault;
  }

  String normalizePathTag(String path) {
    for (String prefix : RISK_CHECK_PATHS) {
      if (path.startsWith(prefix)) {
        return prefix;
      }
    }
    return "other";
  }

  String safeTag(String value) {
    return value == null || value.isBlank() ? "unknown" : value.toLowerCase(Locale.ROOT);
  }
}
