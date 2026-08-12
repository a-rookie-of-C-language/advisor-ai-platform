package cn.edu.cqut.advisorplatform.riskcontrol.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.riskcontrol.dao.UserViolationDao;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.entity.UserViolation;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import cn.edu.cqut.advisorplatform.riskcontrol.service.filter.RiskFilter;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class RiskEngineTest {

  @Test
  void shouldPassWhenAllFiltersPass() {
    RiskFilter filter1 = mock(RiskFilter.class);
    RiskFilter filter2 = mock(RiskFilter.class);
    UserViolationDao userViolationDao = mock(UserViolationDao.class);

    when(filter1.check(any())).thenReturn(RiskCheckResponse.builder().passed(true).build());
    when(filter2.check(any())).thenReturn(RiskCheckResponse.builder().passed(true).build());

    RiskEngine engine =
        new RiskEngine(List.of(filter1, filter2), userViolationDao, new SimpleMeterRegistry());

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
    UserViolationDao userViolationDao = mock(UserViolationDao.class);

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
        new RiskEngine(List.of(filter1, filter2), userViolationDao, new SimpleMeterRegistry());

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
    UserViolationDao userViolationDao = mock(UserViolationDao.class);

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
        new RiskEngine(List.of(filter1), userViolationDao, new SimpleMeterRegistry());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(42L)
            .content("bad")
            .direction(RiskDirection.INPUT)
            .requestPath("/api/chat/stream")
            .build();

    engine.check(request);

    verify(userViolationDao).save(any());
  }

  @Test
  void shouldStoreSanitizedRequestBodyPreviewWhenRecordingViolation() {
    RiskFilter filter1 = mock(RiskFilter.class);
    UserViolationDao userViolationDao = mock(UserViolationDao.class);

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
        new RiskEngine(List.of(filter1), userViolationDao, new SimpleMeterRegistry());

    String requestBody = "safe\u0000body\n" + "x".repeat(3000);
    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(42L)
            .content("bad")
            .direction(RiskDirection.INPUT)
            .requestPath("/api/chat/stream")
            .requestBody(requestBody)
            .build();

    engine.check(request);

    ArgumentCaptor<UserViolation> violationCaptor = forClass(UserViolation.class);
    verify(userViolationDao).save(violationCaptor.capture());
    String savedRequestBody = violationCaptor.getValue().getRequestBody();
    assertThat(savedRequestBody).doesNotContain("\u0000");
    assertThat(savedRequestBody).contains("safebody\n");
    assertThat(savedRequestBody).endsWith("...[truncated]");
    assertThat(savedRequestBody.length()).isLessThan(requestBody.length());
  }

  @Test
  void shouldNotRecordViolationWhenUserIdNull() {
    RiskFilter filter1 = mock(RiskFilter.class);
    UserViolationDao userViolationDao = mock(UserViolationDao.class);

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
        new RiskEngine(List.of(filter1), userViolationDao, new SimpleMeterRegistry());

    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(null)
            .content("bad")
            .direction(RiskDirection.INPUT)
            .build();

    engine.check(request);

    verify(userViolationDao, never()).save(any());
  }
}
