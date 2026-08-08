package cn.edu.cqut.advisorplatform.riskcontrol.service.filter;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RiskPatternSupport {

  private final ConcurrentMap<String, Optional<Pattern>> cache = new ConcurrentHashMap<>();

  public Optional<Pattern> compile(String ruleName, String patternText) {
    if (patternText == null || patternText.isBlank()) {
      return Optional.empty();
    }
    return cache.computeIfAbsent(patternText, key -> compileInternal(ruleName, key));
  }

  private Optional<Pattern> compileInternal(String ruleName, String patternText) {
    try {
      return Optional.of(Pattern.compile(patternText, Pattern.CASE_INSENSITIVE));
    } catch (PatternSyntaxException e) {
      log.error("Invalid regex pattern in rule {}: {}", ruleName, patternText, e);
      return Optional.empty();
    }
  }
}
