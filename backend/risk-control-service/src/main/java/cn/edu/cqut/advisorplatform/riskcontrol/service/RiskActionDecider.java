package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class RiskActionDecider {

  public String decideAction(RiskRule rule, String defaultAction) {
    if (rule.getAction() != null && !rule.getAction().isBlank()) {
      return rule.getAction().trim().toLowerCase(Locale.ROOT);
    }
    String severity = rule.getSeverity() == null ? "" : rule.getSeverity().toLowerCase(Locale.ROOT);
    return switch (severity) {
      case "high", "critical" -> "reject";
      case "medium" -> "review";
      case "low" -> "challenge";
      default -> defaultAction;
    };
  }
}
