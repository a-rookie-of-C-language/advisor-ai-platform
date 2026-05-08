package cn.edu.cqut.advisorplatform.riskcontrol.dao.impl;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.RiskRuleDao;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.RiskRuleRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RiskRuleDaoImpl implements RiskRuleDao {

  private final RiskRuleRepository riskRuleRepository;

  @Override
  public List<RiskRule> findByRuleTypeAndDirectionEnabled(
      String ruleType, RiskDirection direction) {
    return riskRuleRepository.findByRuleTypeAndDirectionAndEnabledTrue(ruleType, direction);
  }
}
