package cn.edu.cqut.advisorplatform.riskcontrol.dao;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import java.util.List;

public interface RiskRuleDao {

  List<RiskRule> findByRuleTypeAndDirectionEnabled(String ruleType, RiskDirection direction);
}
