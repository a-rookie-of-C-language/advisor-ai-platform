package cn.edu.cqut.advisorplatform.service.impl;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

class AgentProxyTransportSupport {

  private static final int MAX_ERROR_BODY_BYTES = 8192;

  HttpRequest buildRequest(
      String payload,
      boolean aiGatewayEnabled,
      String aiGatewayBaseUrl,
      String agentBaseUrl,
      String aiGatewayApiKey,
      String agentApiToken,
      long requestTimeoutMs,
      String traceId,
      String turnId) {
    HttpRequest.Builder requestBuilder =
        HttpRequest.newBuilder()
            .uri(
                URI.create(
                    aiGatewayEnabled
                        ? aiGatewayBaseUrl + "/v1/chat/stream"
                        : agentBaseUrl + "/chat/stream"))
            .version(java.net.http.HttpClient.Version.HTTP_1_1)
            .timeout(java.time.Duration.ofMinutes(10))
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .header(
                "Authorization", "Bearer " + (aiGatewayEnabled ? aiGatewayApiKey : agentApiToken))
            .timeout(java.time.Duration.ofMillis(requestTimeoutMs))
            .POST(HttpRequest.BodyPublishers.ofByteArray(payload.getBytes(StandardCharsets.UTF_8)));
    if (!aiGatewayEnabled) {
      requestBuilder.header("X-Memory-Token", agentApiToken);
    }
    if (traceId != null && !traceId.isBlank()) {
      requestBuilder.header("X-Trace-Id", traceId);
    }
    if (turnId != null && !turnId.isBlank()) {
      requestBuilder.header("X-Turn-Id", turnId);
    }
    return requestBuilder.build();
  }

  String readErrorBody(HttpResponse<InputStream> response) {
    try (InputStream err = response.body()) {
      byte[] body = err.readNBytes(MAX_ERROR_BODY_BYTES + 1);
      boolean truncated = body.length > MAX_ERROR_BODY_BYTES;
      byte[] preview = truncated ? Arrays.copyOf(body, MAX_ERROR_BODY_BYTES) : body;
      String text = new String(preview, StandardCharsets.UTF_8);
      return truncated ? text + "...[truncated]" : text;
    } catch (IOException e) {
      return "";
    }
  }

  boolean isClientAbort(IOException io) {
    String msg = io.getMessage();
    if (msg == null) {
      return false;
    }
    String lower = msg.toLowerCase();
    return lower.contains("broken pipe")
        || lower.contains("connection reset")
        || lower.contains("forcibly closed")
        || lower.contains("stream closed");
  }

  String preview(String text, int limit) {
    if (text == null) {
      return "";
    }
    String normalized = text.replace("\r", " ").replace("\n", " ");
    if (normalized.length() <= limit) {
      return normalized;
    }
    return normalized.substring(0, limit);
  }

  long elapsedSince(long startAt) {
    return Math.max(0L, System.currentTimeMillis() - startAt);
  }
}
