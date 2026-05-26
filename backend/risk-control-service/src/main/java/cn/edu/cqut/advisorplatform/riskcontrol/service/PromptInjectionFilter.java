package cn.edu.cqut.advisorplatform.riskcontrol.service;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.RiskRuleDao;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Order(40)
@RequiredArgsConstructor
public class PromptInjectionFilter implements RiskFilter {

  private final RiskRuleDao riskRuleDao;
  private final RiskActionDecider riskActionDecider;
  private final RiskPatternSupport riskPatternSupport;

  @Override
  public String getName() {
    return "prompt-injection";
  }

  @Override
  public RiskCheckResponse check(RiskCheckRequest request) {
    String content = request.getContent();
    if (content == null || content.isBlank()) {
      return passed();
    }

    List<RiskRule> rules =
        riskRuleDao.findByRuleTypeAndDirectionEnabled("prompt_injection", request.getDirection());
    for (RiskRule rule : rules) {
      Optional<java.util.regex.Pattern> pattern =
          riskPatternSupport.compile(rule.getName(), rule.getPattern());
      if (pattern.isEmpty()) {
        continue;
      }
      if (pattern.get().matcher(content).find()) {
        log.warn(
            "Prompt injection detected: userId={}, rule={}, matched={}",
            request.getUserId(),
            rule.getName(),
            rule.getPattern());
        return RiskCheckResponse.builder()
            .passed(false)
            .action(riskActionDecider.decideAction(rule, "reject"))
            .reason("Prompt 注入风险")
            .category("prompt_injection")
            .matchedKeyword(rule.getName())
            .statusCode(400)
            .message("检测到异常请求，请重新描述您的问题")
            .build();
      }
    }
    return passed();
  }

  private RiskCheckResponse passed() {
    return RiskCheckResponse.builder().passed(true).build();
  }
}
