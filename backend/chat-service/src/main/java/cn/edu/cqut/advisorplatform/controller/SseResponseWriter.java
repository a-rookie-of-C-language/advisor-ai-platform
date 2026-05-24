package cn.edu.cqut.advisorplatform.controller;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.lang.Nullable;

class SseResponseWriter {

  void writeErrorEvent(OutputStream outputStream, @Nullable String rawMessage) {
    String message = safeJson(rawMessage);
    String sseError = "event:error\ndata:{\"message\":\"" + message + "\"}\n\n";
    try {
      outputStream.write(sseError.getBytes(StandardCharsets.UTF_8));
      outputStream.flush();
    } catch (Exception ignored) {
      // client might already disconnect
    }
  }

  void writeDoneEvent(
      OutputStream outputStream, String finishReason, String turnId, String traceId) {
    String safeFinishReason = safeJson(finishReason);
    String safeTurnId = safeJson(turnId);
    String safeTraceId = safeJson(traceId);
    String sseDone =
        "event:done\n"
            + "data:{\"finish_reason\":\""
            + safeFinishReason
            + "\",\"turnId\":\""
            + safeTurnId
            + "\",\"traceId\":\""
            + safeTraceId
            + "\"}\n\n";
    try {
      outputStream.write(sseDone.getBytes(StandardCharsets.UTF_8));
      outputStream.flush();
    } catch (Exception ignored) {
      // client might already disconnect
    }
  }

  private String safeJson(@Nullable String raw) {
    if (raw == null || raw.isBlank()) {
      return "stream failed";
    }
    return raw.replace("\\", "\\\\").replace("\"", "\\\"").replace("\r", " ").replace("\n", " ");
  }
}
