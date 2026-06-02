package cn.edu.cqut.advisorplatform.riskcontrol.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.RateLimitDao;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

  @Mock private RateLimitDao rateLimitDao;

  @InjectMocks private RateLimitFilter rateLimitFilter;

  @Test
  void shouldPassWhenUserIdIsNull() {
    RiskCheckRequest request = RiskCheckRequest.builder().userId(null).build();

    RiskCheckResponse response = rateLimitFilter.check(request);

    assertThat(response.isPassed()).isTrue();
    verify(rateLimitDao, never()).incrementAndExpireOnFirstHit(any(), any());
  }

  @Test
  void shouldPassWhenCountDoesNotExceedLimit() {
    ReflectionTestUtils.setField(rateLimitFilter, "requestsPerMinute", 10);
    when(rateLimitDao.incrementAndExpireOnFirstHit(eq("rate_limit:1"), eq(Duration.ofMinutes(1))))
        .thenReturn(10L);

    RiskCheckRequest request = RiskCheckRequest.builder().userId(1L).build();

    RiskCheckResponse response = rateLimitFilter.check(request);

    assertThat(response.isPassed()).isTrue();
  }

  @Test
  void shouldChallengeWhenCountExceedsLimit() {
    ReflectionTestUtils.setField(rateLimitFilter, "requestsPerMinute", 10);
    when(rateLimitDao.incrementAndExpireOnFirstHit(eq("rate_limit:1"), eq(Duration.ofMinutes(1))))
        .thenReturn(11L);

    RiskCheckRequest request = RiskCheckRequest.builder().userId(1L).build();

    RiskCheckResponse response = rateLimitFilter.check(request);

    assertThat(response.isPassed()).isFalse();
    assertThat(response.getAction()).isEqualTo("challenge");
    assertThat(response.getCategory()).isEqualTo("rate_limit");
    assertThat(response.getStatusCode()).isEqualTo(429);
  }
}
