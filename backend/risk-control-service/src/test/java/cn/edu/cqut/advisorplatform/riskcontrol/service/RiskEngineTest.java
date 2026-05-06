package cn.edu.cqut.advisorplatform.riskcontrol.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import cn.edu.cqut.advisorplatform.riskcontrol.repository.UserViolationRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RiskEngineTest {

  @Mock private List<RiskFilter> filters;

  @Mock private UserViolationRepository userViolationRepository;

  @InjectMocks private RiskEngine riskEngine;

  @Test
  void shouldPassWhenAllFiltersPass() {
    RiskFilter filter1 = mock(RiskFilter.class);
    RiskFilter filter2 = mock(RiskFilter.class);

    when(filter1.check(any())).thenReturn(RiskCheckResponse.builder().passed(true).build());
    when(filter2.check(any())).thenReturn(RiskCheckResponse.builder().passed(true).build());

    RiskEngine engine =
        new RiskEngine(
            List.of(filter1, filter2), userViolationRepository, new SimpleMeterRegistry());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("hello")
            .direction(RiskDirection.INPUT)
            .build();

    RiskCheckResponse response = engine.check(request);

    assertThat(response.isPassed()).isTrue();
    verify(filter1).check(request);
    verify(filter2).check(request);
  }

  @Test
  void shouldStopAtFirstFailedFilter() {
    RiskFilter filter1 = mock(RiskFilter.class);
    RiskFilter filter2 = mock(RiskFilter.class);

    RiskCheckResponse blockedResponse =
        RiskCheckResponse.builder()
            .passed(false)
            .action("reject")
            .reason("blocked")
            .category("test")
            .statusCode(400)
            .message("blocked")
            .build();

    when(filter1.check(any())).thenReturn(blockedResponse);
    when(filter1.getName()).thenReturn("filter1");

    RiskEngine engine =
        new RiskEngine(
            List.of(filter1, filter2), userViolationRepository, new SimpleMeterRegistry());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("bad content")
            .direction(RiskDirection.INPUT)
            .build();

    RiskCheckResponse response = engine.check(request);

    assertThat(response.isPassed()).isFalse();
    assertThat(response.getCategory()).isEqualTo("test");
    verify(filter1).check(request);
    verify(filter2, never()).check(any());
  }

  @Test
  void shouldRecordViolationWhenUserIdPresent() {
    RiskFilter filter1 = mock(RiskFilter.class);

    RiskCheckResponse blockedResponse =
        RiskCheckResponse.builder()
            .passed(false)
            .action("reject")
            .reason("violation")
            .category("content_safety")
            .statusCode(400)
            .message("blocked")
            .build();

    when(filter1.check(any())).thenReturn(blockedResponse);
    when(filter1.getName()).thenReturn("filter1");

    RiskEngine engine =
        new RiskEngine(List.of(filter1), userViolationRepository, new SimpleMeterRegistry());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(42L)
            .content("bad")
            .direction(RiskDirection.INPUT)
            .requestPath("/api/chat/stream")
            .build();

    engine.check(request);

    verify(userViolationRepository).save(any());
  }

  @Test
  void shouldNotRecordViolationWhenUserIdNull() {
    RiskFilter filter1 = mock(RiskFilter.class);

    RiskCheckResponse blockedResponse =
        RiskCheckResponse.builder()
            .passed(false)
            .action("reject")
            .reason("violation")
            .category("content_safety")
            .statusCode(400)
            .message("blocked")
            .build();

    when(filter1.check(any())).thenReturn(blockedResponse);
    when(filter1.getName()).thenReturn("filter1");

    RiskEngine engine =
        new RiskEngine(List.of(filter1), userViolationRepository, new SimpleMeterRegistry());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(null)
            .content("bad")
            .direction(RiskDirection.INPUT)
            .build();

    engine.check(request);

    verify(userViolationRepository, never()).save(any());
  }
}
