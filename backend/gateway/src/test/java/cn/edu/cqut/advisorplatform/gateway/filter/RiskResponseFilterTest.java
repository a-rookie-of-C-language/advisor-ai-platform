package cn.edu.cqut.advisorplatform.gateway.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import cn.edu.cqut.advisorplatform.gateway.filter.risk.RiskResponseFilter;
import cn.edu.cqut.advisorplatform.gateway.filter.risk.RiskResponseSupport;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class RiskResponseFilterTest {

  @Mock private GatewayFilterChain chain;
  @Mock private RiskResponseSupport support;
  @Mock private ServerWebExchange exchange;
  @Mock private ServerHttpRequest request;

  private RiskResponseFilter riskResponseFilter;

  @BeforeEach
  void setUp() {
    riskResponseFilter = new RiskResponseFilter(support);
  }

  @Test
  void shouldSkipNonRiskPaths() {
    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/auth/login"));
    when(chain.filter(exchange)).thenReturn(Mono.empty());

    Mono<Void> result = riskResponseFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(chain).filter(exchange);
  }

  @Test
  void shouldSkipGetRequests() {
    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/chat/stream"));
    when(chain.filter(exchange)).thenReturn(Mono.empty());

    Mono<Void> result = riskResponseFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(chain).filter(exchange);
  }

  @Test
  void shouldDecorateResponseForPostOnRiskPaths() {
    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/chat/message"));
    when(request.getMethod()).thenReturn(HttpMethod.POST);
    when(support.filter(any(), any())).thenReturn(Mono.empty());

    Mono<Void> result = riskResponseFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(support).filter(exchange, chain);
  }

  @Test
  void shouldReturnCorrectOrder() {
    assertThat(riskResponseFilter.getOrder()).isEqualTo(-1);
  }
}
