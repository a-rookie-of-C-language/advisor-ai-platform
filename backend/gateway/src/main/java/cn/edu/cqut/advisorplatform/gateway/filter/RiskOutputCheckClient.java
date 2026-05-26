package cn.edu.cqut.advisorplatform.gateway.filter;

import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

class RiskOutputCheckClient {

  private final WebClient webClient;
  private final RiskResponseRequestFactory requestFactory = new RiskResponseRequestFactory();

  RiskOutputCheckClient(WebClient webClient) {
    this.webClient = webClient;
  }

  Mono<RiskCheckResponse> check(
      String riskControlServiceUrl,
      String internalServiceToken,
      String userId,
      String path,
      String content) {
    RiskCheckRequest request = requestFactory.outputRequest(userId, path, content);

    return webClient
        .post()
        .uri(riskControlServiceUrl + "/internal/risk/check")
        .header("X-Internal-Token", internalServiceToken)
        .bodyValue(request)
        .retrieve()
        .bodyToMono(RiskCheckResponse.class)
        .defaultIfEmpty(RiskCheckResponse.passed());
  }
}
