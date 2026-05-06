package cn.edu.cqut.advisorplatform.gateway.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class RiskControlFilterTest {

  @Mock private WebClient.Builder webClientBuilder;
  @Mock private WebClient webClient;
  @Mock private GatewayFilterChain chain;
  @Mock private ServerWebExchange exchange;
  @Mock private ServerHttpRequest request;
  @Mock private ServerHttpResponse response;

  private RiskControlFilter riskControlFilter;

  @BeforeEach
  void setUp() {
    when(webClientBuilder.build()).thenReturn(webClient);
    riskControlFilter = new RiskControlFilter(webClientBuilder, new SimpleMeterRegistry());
  }

  @Test
  void shouldSkipNonRiskPaths() {
    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/auth/login"));
    when(chain.filter(exchange)).thenReturn(Mono.empty());

    Mono<Void> result = riskControlFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(chain).filter(exchange);
  }

  @Test
  void shouldSkipGetRequests() {
    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/chat/sessions"));
    when(request.getMethod()).thenReturn(HttpMethod.GET);
    when(chain.filter(exchange)).thenReturn(Mono.empty());

    Mono<Void> result = riskControlFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(chain).filter(exchange);
  }

  @SuppressWarnings("unchecked")
  @Test
  void shouldCheckPostRequestsOnRiskPaths() {
    HttpHeaders headers = new HttpHeaders();
    headers.add("X-User-Id", "123");
    headers.add("X-Session-Id", "session-1");

    when(exchange.getRequest()).thenReturn(request);
    when(request.getURI()).thenReturn(URI.create("http://localhost/api/chat/stream"));
    when(request.getMethod()).thenReturn(HttpMethod.POST);
    when(request.getHeaders()).thenReturn(headers);
    when(request.getRemoteAddress()).thenReturn(new InetSocketAddress("127.0.0.1", 8080));

    String body = "{\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}";
    DataBuffer dataBuffer =
        new DefaultDataBufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
    when(request.getBody()).thenReturn(Flux.just(dataBuffer));

    WebClient.RequestBodyUriSpec requestBodyUriSpec = mock(WebClient.RequestBodyUriSpec.class);
    WebClient.RequestBodySpec requestBodySpec = mock(WebClient.RequestBodySpec.class);
    WebClient.ResponseSpec responseSpec = mock(WebClient.ResponseSpec.class);
    WebClient.RequestHeadersSpec<?> headersSpec = mock(WebClient.RequestHeadersSpec.class);

    when(webClient.post()).thenReturn(requestBodyUriSpec);
    when(requestBodyUriSpec.uri(any(String.class))).thenReturn(requestBodySpec);
    when(requestBodySpec.bodyValue(any())).thenReturn((WebClient.RequestHeadersSpec) headersSpec);
    when(headersSpec.retrieve()).thenReturn(responseSpec);

    RiskControlFilter.RiskCheckResponse passedResponse =
        RiskControlFilter.RiskCheckResponse.passed();
    when(responseSpec.bodyToMono(RiskControlFilter.RiskCheckResponse.class))
        .thenReturn(Mono.just(passedResponse));

    ServerWebExchange.Builder exchangeBuilder = mock(ServerWebExchange.Builder.class);
    when(exchange.mutate()).thenReturn(exchangeBuilder);
    when(exchangeBuilder.request(any(ServerHttpRequest.class))).thenReturn(exchangeBuilder);
    when(exchangeBuilder.build()).thenReturn(exchange);
    when(chain.filter(any())).thenReturn(Mono.empty());

    Mono<Void> result = riskControlFilter.filter(exchange, chain);

    StepVerifier.create(result).verifyComplete();
    verify(chain).filter(any());
  }

  @Test
  void shouldReturnCorrectOrder() {
    assertThat(riskControlFilter.getOrder()).isEqualTo(-50);
  }
}
