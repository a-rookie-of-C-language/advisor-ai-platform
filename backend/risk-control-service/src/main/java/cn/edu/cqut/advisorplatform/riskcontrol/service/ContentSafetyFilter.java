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
@Order(30)
@RequiredArgsConstructor
public class ContentSafetyFilter implements RiskFilter {

  private final RiskRuleDao riskRuleDao;
  private final RiskActionDecider riskActionDecider;
  private final RiskPatternSupport riskPatternSupport;

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
        riskRuleDao.findByRuleTypeAndDirectionEnabled("content_safety", request.getDirection());
    for (RiskRule rule : rules) {
      Optional<java.util.regex.Pattern> pattern =
          riskPatternSupport.compile(rule.getName(), rule.getPattern());
      if (pattern.isEmpty()) {
        continue;
      }
      if (pattern.get().matcher(content).find()) {
        log.warn(
            "Content safety violation: userId={}, rule={}, matched={}",
            request.getUserId(),
            rule.getName(),
            rule.getPattern());
        return RiskCheckResponse.builder()
            .passed(false)
            .action(riskActionDecider.decideAction(rule, "reject"))
            .reason("鍐呭瀹夊叏杩濊")
            .category("content_safety")
            .matchedKeyword(rule.getName())
            .statusCode(400)
            .message("鎮ㄧ殑闂娑夊強鏁忔劅鍐呭锛屾棤娉曞洖绛?")
            .build();
      }
    }
    return passed();
  }

  private RiskCheckResponse passed() {
    return RiskCheckResponse.builder().passed(true).build();
  }
}
