package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class AgentProxyHttpClientSupport {

  private static final int DEBUG_PREVIEW_LIMIT = 200;

  private final AgentProxyTransportSupport transportSupport;
  private final HttpClient httpClient;

  AgentProxyHttpClientSupport(AgentProxyTransportSupport transportSupport, long requestTimeoutMs) {
    this.transportSupport = transportSupport;
    this.httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofMillis(requestTimeoutMs))
            .build();
  }

  HttpResponse<InputStream> send(HttpRequest request, int payloadBytes, long startAt)
      throws IOException {
    HttpResponse<InputStream> response;
    try {
      response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Agent stream interrupted", e);
    }

    if (response.statusCode() >= 400) {
      String errorBody = transportSupport.readErrorBody(response);
      log.warn(
          "agent_proxy failed, status={}, payloadBytes={}, bodyPreview={}, elapsedMs={}",
          response.statusCode(),
          payloadBytes,
          transportSupport.preview(errorBody, DEBUG_PREVIEW_LIMIT),
          transportSupport.elapsedSince(startAt));
      throw new BadRequestException("agent stream failed: http " + response.statusCode());
    }
    return response;
  }
}
