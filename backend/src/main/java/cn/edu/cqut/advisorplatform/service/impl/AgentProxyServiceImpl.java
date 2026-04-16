package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AgentProxyServiceImpl implements AgentProxyService {

    private static final int DEBUG_PREVIEW_LIMIT = 200;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String agentBaseUrl;
    private final String agentApiToken;
    private final boolean debugStream;

    public AgentProxyServiceImpl(
            ObjectMapper objectMapper,
            @Value("${advisor.agent.base-url:http://127.0.0.1:8001}") String agentBaseUrl,
            @Value("${advisor.agent.api-token:${MEMORY_API_TOKEN:arookieofc}}") String agentApiToken,
            @Value("${advisor.agent.timeout-ms:600000}") long timeoutMs,
            @Value("${advisor.agent.debug-stream:${DEBUG_STREAM:false}}") boolean debugStream
    ) {
        this.objectMapper = objectMapper;
        this.agentBaseUrl = agentBaseUrl;
        this.agentApiToken = agentApiToken;
        this.debugStream = debugStream;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(Math.max(timeoutMs, 1000L)))
                .build();
    }

    @Override
    public void proxyChatStream(ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException {
        String payload = buildPayloadJson(request, userId);
        if (debugStream) {
            log.info("debug_stream java request: sessionId={}, userId={}, payload_preview={}",
                    request.getSessionId(), userId, preview(payload));
        }

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(agentBaseUrl + "/chat/stream"))
                .timeout(Duration.ofMinutes(10))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .header("Cache-Control", "no-cache")
                .header("X-Memory-Token", agentApiToken)
                .header("Authorization", "Bearer " + agentApiToken)
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<InputStream> response;
        try {
            response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Agent stream interrupted", e);
        }

        if (response.statusCode() >= 400) {
            String errorBody = "";
            try (InputStream err = response.body()) {
                errorBody = new String(err.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.warn("Failed to read agent error body: {}", e.getMessage());
            }
            log.warn("Agent stream failed: status={}, body_preview={}", response.statusCode(), preview(errorBody));
            throw new BadRequestException("agent stream failed: http " + response.statusCode());
        }

        StringBuilder sseBuffer = new StringBuilder();
        StringBuilder deltaPreview = new StringBuilder();
        int deltaCount = 0;

        if (debugStream) {
            log.info("debug_stream java start: sessionId={}, userId={}", request.getSessionId(), userId);
        }

        try (InputStream bodyStream = response.body()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = bodyStream.read(buffer)) != -1) {
                try {
                    outputStream.write(buffer, 0, read);
                    outputStream.flush();

                    if (debugStream) {
                        String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
                        sseBuffer.append(chunk);
                        deltaCount += collectDeltaPreview(sseBuffer, deltaPreview);
                    }
                } catch (IOException io) {
                    if (isClientAbort(io)) {
                        log.warn("Client disconnected during stream forwarding: {}", io.getMessage());
                        return;
                    }
                    throw io;
                }
            }
        } finally {
            if (debugStream) {
                log.info("debug_stream java done: deltas={}, answer_preview={}", deltaCount, deltaPreview);
            }
        }
    }

    private int collectDeltaPreview(StringBuilder sseBuffer, StringBuilder deltaPreview) {
        int count = 0;
        int blockEnd;
        while ((blockEnd = sseBuffer.indexOf("\n\n")) >= 0) {
            String block = sseBuffer.substring(0, blockEnd);
            sseBuffer.delete(0, blockEnd + 2);
            String delta = extractDelta(block);
            if (delta == null || delta.isBlank()) {
                continue;
            }
            count++;
            if (deltaPreview.length() >= DEBUG_PREVIEW_LIMIT) {
                continue;
            }
            int remain = DEBUG_PREVIEW_LIMIT - deltaPreview.length();
            deltaPreview.append(delta, 0, Math.min(remain, delta.length()));
        }
        return count;
    }

    private String extractDelta(String sseBlock) {
        String[] lines = sseBlock.split("\n");
        String event = "message";
        StringBuilder dataBuilder = new StringBuilder();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("event:")) {
                event = trimmed.substring(6).trim();
            } else if (trimmed.startsWith("data:")) {
                dataBuilder.append(trimmed.substring(5).trim());
            }
        }

        if (!"delta".equals(event) || dataBuilder.isEmpty()) {
            return null;
        }

        try {
            JsonNode node = objectMapper.readTree(dataBuilder.toString());
            return node.path("text").asText("");
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isClientAbort(IOException io) {
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

    private String buildPayloadJson(ChatStreamRequestDTO request, Long userId) throws IOException {
        List<Map<String, String>> messages = request.getMessages().stream()
                .filter(message -> message != null && message.getRole() != null && message.getContent() != null)
                .map(message -> toMap(message.getRole(), message.getContent()))
                .filter(message -> !message.get("content").isBlank())
                .toList();

        if (messages.isEmpty()) {
            throw new BadRequestException("agent stream failed: no valid messages");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("messages", messages);
        payload.put("userId", userId);
        payload.put("sessionId", request.getSessionId());
        payload.put("kbId", request.getKbId());
        return objectMapper.writeValueAsString(payload);
    }

    private Map<String, String> toMap(String role, String content) {
        Map<String, String> data = new HashMap<>();
        data.put("role", role.trim());
        data.put("content", content.trim());
        return data;
    }

    private String preview(String text) {
        if (text == null) {
            return "";
        }
        String normalized = text.replace("\r", " ").replace("\n", " ");
        if (normalized.length() <= DEBUG_PREVIEW_LIMIT) {
            return normalized;
        }
        return normalized.substring(0, DEBUG_PREVIEW_LIMIT);
    }
}
