package cn.edu.cqut.advisorplatform.riskcontrol.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.RiskRuleRepository;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ContentSafetyFilterTest {

  @Mock private RiskRuleRepository riskRuleRepository;
  @Mock private RiskActionDecider riskActionDecider;

  @InjectMocks private ContentSafetyFilter contentSafetyFilter;

  @Test
  void shouldPassWhenContentIsNull() {
    RiskCheckRequest request =
        RiskCheckRequest.builder().userId(1L).content(null).direction(RiskDirection.INPUT).build();

    RiskCheckResponse response = contentSafetyFilter.check(request);

    assertThat(response.isPassed()).isTrue();
  }

  @Test
  void shouldPassWhenContentIsBlank() {
    RiskCheckRequest request =
        RiskCheckRequest.builder().userId(1L).content("   ").direction(RiskDirection.INPUT).build();

    RiskCheckResponse response = contentSafetyFilter.check(request);

    assertThat(response.isPassed()).isTrue();
  }

  @Test
  void shouldPassWhenNoRulesMatch() {
    RiskRule rule =
        RiskRule.builder()
            .name("test-rule")
            .pattern("forbidden")
            .action("reject")
            .severity("high")
            .direction(RiskDirection.INPUT)
            .enabled(true)
            .build();

    when(riskRuleRepository.findByRuleTypeAndDirectionAndEnabledTrue(
            eq("content_safety"), eq(RiskDirection.INPUT)))
        .thenReturn(List.of(rule));

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("normal content")
            .direction(RiskDirection.INPUT)
            .build();

    RiskCheckResponse response = contentSafetyFilter.check(request);

    assertThat(response.isPassed()).isTrue();
  }

  @Test
  void shouldBlockWhenRuleMatches() {
    RiskRule rule =
        RiskRule.builder()
            .name("sensitive-word")
            .pattern("forbidden|sensitive")
            .action("reject")
            .severity("high")
            .direction(RiskDirection.BOTH)
            .enabled(true)
            .build();

    when(riskRuleRepository.findByRuleTypeAndDirectionAndEnabledTrue(
            eq("content_safety"), eq(RiskDirection.INPUT)))
        .thenReturn(List.of(rule));
    when(riskActionDecider.decideAction(rule, "reject")).thenReturn("reject");

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("this contains forbidden text")
            .direction(RiskDirection.INPUT)
            .build();

    RiskCheckResponse response = contentSafetyFilter.check(request);

    assertThat(response.isPassed()).isFalse();
    assertThat(response.getCategory()).isEqualTo("content_safety");
    assertThat(response.getAction()).isEqualTo("reject");
    assertThat(response.getStatusCode()).isEqualTo(400);
  }

  @Test
  void shouldPassWhenNoRulesExist() {
    when(riskRuleRepository.findByRuleTypeAndDirectionAndEnabledTrue(
            eq("content_safety"), eq(RiskDirection.OUTPUT)))
        .thenReturn(Collections.emptyList());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("any content")
            .direction(RiskDirection.OUTPUT)
            .build();

    RiskCheckResponse response = contentSafetyFilter.check(request);

    assertThat(response.isPassed()).isTrue();
  }

  @Test
  void shouldHandleInvalidRegexGracefully() {
    RiskRule badRule =
        RiskRule.builder()
            .name("bad-regex")
            .pattern("[invalid(")
            .action("reject")
            .severity("high")
            .direction(RiskDirection.INPUT)
            .enabled(true)
            .build();

    when(riskRuleRepository.findByRuleTypeAndDirectionAndEnabledTrue(
            eq("content_safety"), eq(RiskDirection.INPUT)))
        .thenReturn(List.of(badRule));

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("normal content")
            .direction(RiskDirection.INPUT)
            .build();

    RiskCheckResponse response = contentSafetyFilter.check(request);

    assertThat(response.isPassed()).isTrue();
  }
}
