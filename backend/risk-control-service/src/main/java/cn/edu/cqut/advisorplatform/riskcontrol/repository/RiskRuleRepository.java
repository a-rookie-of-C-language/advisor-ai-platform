package cn.edu.cqut.advisorplatform.riskcontrol.repository;

import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskRuleRepository extends JpaRepository<RiskRule, Long> {

  List<RiskRule> findByEnabledTrue();

  List<RiskRule> findByRuleTypeAndEnabledTrue(String ruleType);

  @Query(
      "SELECT r FROM RiskRule r WHERE r.ruleType = :ruleType AND r.enabled = true "
          + "AND (r.direction = :direction OR r.direction = 'BOTH')")
  List<RiskRule> findByRuleTypeAndDirectionAndEnabledTrue(
      @Param("ruleType") String ruleType, @Param("direction") RiskDirection direction);
}
