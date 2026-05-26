package cn.edu.cqut.advisorplatform.gateway.filter;

import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

class RiskInputCheckClient {

  private final WebClient webClient;
  private final RiskControlRequestFactory requestFactory = new RiskControlRequestFactory();

  RiskInputCheckClient(WebClient webClient) {
    this.webClient = webClient;
  }

  Mono<RiskCheckResponse> check(
      String riskControlServiceUrl,
      String internalServiceToken,
      String userId,
      String sessionId,
      String ipAddress,
      String path,
      String requestBody) {
    RiskCheckRequest request =
        requestFactory.inputRequest(userId, sessionId, ipAddress, path, requestBody);

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
