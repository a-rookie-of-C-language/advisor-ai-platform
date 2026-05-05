package cn.edu.cqut.advisorplatform.riskcontrol.repository;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskRuleRepository extends JpaRepository<RiskRule, Long> {

  List<RiskRule> findByEnabledTrue();

  List<RiskRule> findByRuleTypeAndEnabledTrue(String ruleType);
}
