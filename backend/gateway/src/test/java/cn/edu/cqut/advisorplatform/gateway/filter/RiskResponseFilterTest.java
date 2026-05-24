package cn.edu.cqut.advisorplatform.gateway.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class RiskResponseFilterTest {

  @Mock private WebClient.Builder webClientBuilder;
  @Mock private WebClient webClient;
  @Mock private GatewayFilterChain chain;
  @Mock private ServerWebExchange exchange;
  @Mock private ServerHttpRequest request;
  @Mock private ServerHttpResponse response;

  private RiskResponseFilter riskResponseFilter;

  @BeforeEach
  void setUp() {
    when(webClientBuilder.build()).thenReturn(webClient);
    riskResponseFilter = new RiskResponseFilter(webClientBuilder, new SimpleMeterRegistry());
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
    when(request.getMethod()).thenReturn(HttpMethod.GET);
    when(chain.filter(exchange)).thenReturn(Mono.empty());

    Mono<Void> result = riskResponseFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(chain).filter(exchange);
  }

  @Test
  void shouldDecorateResponseForPostOnRiskPaths() {
    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/chat/stream"));
    when(request.getMethod()).thenReturn(HttpMethod.POST);
    when(exchange.getResponse()).thenReturn(response);

    ServerWebExchange.Builder exchangeBuilder = mock(ServerWebExchange.Builder.class);
    when(exchange.mutate()).thenReturn(exchangeBuilder);
    when(exchangeBuilder.response(any())).thenReturn(exchangeBuilder);
    when(exchangeBuilder.build()).thenReturn(exchange);
    when(chain.filter(any())).thenReturn(Mono.empty());

    Mono<Void> result = riskResponseFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(exchange.mutate()).response(any());
  }

  @Test
  void shouldReturnCorrectOrder() {
    assertThat(riskResponseFilter.getOrder()).isEqualTo(-1);
  }
}
