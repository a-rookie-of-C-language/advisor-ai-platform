package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.RiskRuleRepository;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Order(30)
@RequiredArgsConstructor
public class ContentSafetyFilter implements RiskFilter {

  private final RiskRuleRepository riskRuleRepository;
  private final RiskActionDecider riskActionDecider;

  @Override
  public String getName() {
    return "content-safety";
  }

  @Override
  public RiskCheckResponse check(RiskCheckRequest request) {
    String content = request.getContent();
    if (content == null || content.isBlank()) {
      return passed();
    }

    List<RiskRule> rules =
        riskRuleRepository.findByRuleTypeAndDirectionAndEnabledTrue(
            "content_safety", request.getDirection());
    for (RiskRule rule : rules) {
      try {
        Pattern pattern = Pattern.compile(rule.getPattern(), Pattern.CASE_INSENSITIVE);
        if (pattern.matcher(content).find()) {
          log.warn(
              "Content safety violation: userId={}, rule={}, matched={}",
              request.getUserId(),
              rule.getName(),
              rule.getPattern());
          return RiskCheckResponse.builder()
              .passed(false)
              .action(riskActionDecider.decideAction(rule, "reject"))
              .reason("内容安全违规")
              .category("content_safety")
              .matchedKeyword(rule.getName())
              .statusCode(400)
              .message("您的问题涉及敏感内容，无法回答")
              .build();
        }
      } catch (Exception e) {
        log.error("Invalid regex pattern in rule {}: {}", rule.getName(), rule.getPattern(), e);
      }
    }
    return passed();
  }

  private RiskCheckResponse passed() {
    return RiskCheckResponse.builder().passed(true).build();
  }
}
