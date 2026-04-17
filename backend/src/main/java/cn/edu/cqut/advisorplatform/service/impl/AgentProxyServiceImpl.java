package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
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
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(Math.max(timeoutMs, 1000L)))
                .build();
    }

    @Override
    public ChatStreamProxyResult proxyChatStream(ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException {
        return proxyInternal(request, userId, outputStream);
    }

    @Override
    public ChatStreamProxyResult proxyChatOnce(ChatStreamRequestDTO request, Long userId) throws IOException {
        return proxyInternal(request, userId, null);
    }

    private ChatStreamProxyResult proxyInternal(ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException {
        long startAt = System.currentTimeMillis();
        String payload = buildPayloadJson(request, userId);
        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);

        log.info("agent_proxy start, traceId={}, sessionId={}, turnId={}, userId={}, payloadBytes={}, streamMode={}",
                LogTraceUtil.get(LogTraceUtil.TRACE_ID),
                request.getSessionId(),
                LogTraceUtil.get(LogTraceUtil.TURN_ID),
                userId,
                payloadBytes.length,
                outputStream != null);

        if (debugStream) {
            log.info("debug_stream java request: sessionId={}, userId={}, payload_length={}, payload_preview={}",
                    request.getSessionId(), userId, payloadBytes.length, preview(payload));
        }

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(agentBaseUrl + "/chat/stream"))
                .version(HttpClient.Version.HTTP_1_1)
                .timeout(Duration.ofMinutes(10))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .header("Cache-Control", "no-cache")
                .header("X-Memory-Token", agentApiToken)
                .header("Authorization", "Bearer " + agentApiToken)
                .POST(HttpRequest.BodyPublishers.ofByteArray(payloadBytes))
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
                log.warn("agent_proxy read_error_body_failed, reason={}", LogTraceUtil.preview(e.getMessage()));
            }
            log.warn("agent_proxy failed, status={}, payloadBytes={}, bodyPreview={}, elapsedMs={}",
                    response.statusCode(),
                    payloadBytes.length,
                    LogTraceUtil.preview(errorBody),
                    elapsedSince(startAt));
            throw new BadRequestException("agent stream failed: http " + response.statusCode());
        }

        StringBuilder sseBuffer = new StringBuilder();
        StringBuilder deltaPreview = new StringBuilder();
        StringBuilder assistantText = new StringBuilder();
        int deltaCount = 0;
        boolean firstDeltaLogged = false;

        if (debugStream) {
            log.info("debug_stream java start: sessionId={}, userId={}", request.getSessionId(), userId);
        }

        try (InputStream bodyStream = response.body()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = bodyStream.read(buffer)) != -1) {
                String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
                sseBuffer.append(chunk);

                int before = deltaCount;
                deltaCount += collectDeltaAndAnswer(sseBuffer, deltaPreview, assistantText);
                if (!firstDeltaLogged && deltaCount > before) {
                    firstDeltaLogged = true;
                    log.info("agent_proxy first_chunk, elapsedMs={}", elapsedSince(startAt));
                }

                if (outputStream != null) {
                    try {
                        outputStream.write(buffer, 0, read);
                        outputStream.flush();
                    } catch (IOException io) {
                        if (isClientAbort(io)) {
                            log.warn("agent_proxy client_disconnected, reason={}", LogTraceUtil.preview(io.getMessage()));
                            return new ChatStreamProxyResult(assistantText.toString());
                        }
                        throw io;
                    }
                }
            }
        } finally {
            if (debugStream) {
                log.info("debug_stream java done: deltas={}, answer_preview={}", deltaCount, deltaPreview);
            }
        }

        log.info("agent_proxy done, deltas={}, answerLen={}, elapsedMs={}",
                deltaCount,
                assistantText.length(),
                elapsedSince(startAt));

        return new ChatStreamProxyResult(assistantText.toString());
    }

    private int collectDeltaAndAnswer(StringBuilder sseBuffer, StringBuilder deltaPreview, StringBuilder assistantText) {
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
            assistantText.append(delta);
            if (debugStream && deltaPreview.length() < DEBUG_PREVIEW_LIMIT) {
                int remain = DEBUG_PREVIEW_LIMIT - deltaPreview.length();
                deltaPreview.append(delta, 0, Math.min(remain, delta.length()));
            }
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

    private long elapsedSince(long startAt) {
        return Math.max(0L, System.currentTimeMillis() - startAt);
    }
}
