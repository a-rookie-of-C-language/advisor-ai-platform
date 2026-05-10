package cn.edu.cqut.advisorplatform.riskcontrol.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckRequest;
import cn.edu.cqut.advisorplatform.riskcontrol.dto.RiskCheckResponse;
import cn.edu.cqut.advisorplatform.riskcontrol.enums.RiskDirection;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RiskFacadeTest {

  @Mock private RiskEngine riskEngine;

  @InjectMocks private RiskFacade riskFacade;

  @Test
  void shouldDefaultToInputDirectionWhenNull() {
    RiskCheckRequest request =
        RiskCheckRequest.builder().userId(1L).content("test").direction(null).build();

    when(riskEngine.check(any())).thenReturn(RiskCheckResponse.builder().passed(true).build());

    riskFacade.check(request);

    assertThat(request.getDirection()).isEqualTo(RiskDirection.INPUT);
  }

  @Test
  void shouldPreserveOutputDirection() {
    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("response content")
            .direction(RiskDirection.OUTPUT)
            .build();

    when(riskEngine.check(any())).thenReturn(RiskCheckResponse.builder().passed(true).build());

    RiskCheckResponse response = riskFacade.check(request);

    assertThat(request.getDirection()).isEqualTo(RiskDirection.OUTPUT);
    assertThat(response.isPassed()).isTrue();
  }

  @Test
  void shouldDelegateToRiskEngine() {
    RiskCheckRequest request =
        RiskCheckRequest.builder()
            .userId(1L)
            .content("bad content")
            .direction(RiskDirection.INPUT)
            .build();

    RiskCheckResponse blockedResponse =
        RiskCheckResponse.builder()
            .passed(false)
            .action("reject")
            .category("content_safety")
            .statusCode(400)
            .message("blocked")
            .build();

    when(riskEngine.check(request)).thenReturn(blockedResponse);

    RiskCheckResponse response = riskFacade.check(request);

    assertThat(response.isPassed()).isFalse();
    assertThat(response.getCategory()).isEqualTo("content_safety");
  }
}
