package cn.edu.cqut.advisorplatform.riskcontrol.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.RiskRuleDao;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.RiskRule;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import cn.edu.cqut.advisorplatform.riskcontrol.service.filter.ContentSafetyFilter;
import cn.edu.cqut.advisorplatform.riskcontrol.service.filter.RiskPatternSupport;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ContentSafetyFilterTest {

  @Mock private RiskRuleDao riskRuleDao;
  @Mock private RiskActionDecider riskActionDecider;
  @Mock private RiskPatternSupport riskPatternSupport;

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

    when(riskRuleDao.findByRuleTypeAndDirectionEnabled(
            eq("content_safety"), eq(RiskDirection.INPUT)))
        .thenReturn(List.of(rule));
    when(riskPatternSupport.compile(eq("test-rule"), eq("forbidden")))
        .thenReturn(Optional.of(Pattern.compile("forbidden", Pattern.CASE_INSENSITIVE)));

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

    when(riskRuleDao.findByRuleTypeAndDirectionEnabled(
            eq("content_safety"), eq(RiskDirection.INPUT)))
        .thenReturn(List.of(rule));
    when(riskPatternSupport.compile(eq("sensitive-word"), eq("forbidden|sensitive")))
        .thenReturn(Optional.of(Pattern.compile("forbidden|sensitive", Pattern.CASE_INSENSITIVE)));
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
    when(riskRuleDao.findByRuleTypeAndDirectionEnabled(
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

    when(riskRuleDao.findByRuleTypeAndDirectionEnabled(
            eq("content_safety"), eq(RiskDirection.INPUT)))
        .thenReturn(List.of(badRule));
    when(riskPatternSupport.compile(eq("bad-regex"), eq("[invalid("))).thenReturn(Optional.empty());

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
