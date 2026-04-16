package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
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

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String agentBaseUrl;
    private final String agentApiToken;

    public AgentProxyServiceImpl(
            ObjectMapper objectMapper,
            @Value("${advisor.agent.base-url:http://127.0.0.1:8001}") String agentBaseUrl,
            @Value("${advisor.agent.api-token:${MEMORY_API_TOKEN:arookieofc}}") String agentApiToken,
            @Value("${advisor.agent.timeout-ms:600000}") long timeoutMs
    ) {
        this.objectMapper = objectMapper;
        this.agentBaseUrl = agentBaseUrl;
        this.agentApiToken = agentApiToken;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(Math.max(timeoutMs, 1000L)))
                .build();
    }

    @Override
    public void proxyChatStream(ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException {
        String payload = buildPayloadJson(request, userId);
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
            throw new BadRequestException("agent stream failed: http " + response.statusCode());
        }

        try (InputStream bodyStream = response.body()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = bodyStream.read(buffer)) != -1) {
                try {
                    outputStream.write(buffer, 0, read);
                    outputStream.flush();
                } catch (IOException io) {
                    if (isClientAbort(io)) {
                        log.warn("Client disconnected during stream forwarding: {}", io.getMessage());
                        return;
                    }
                    throw io;
                }
            }
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
                .map(this::toMap)
                .toList();

        Map<String, Object> payload = new HashMap<>();
        payload.put("messages", messages);
        payload.put("userId", userId);
        payload.put("sessionId", request.getSessionId());
        payload.put("kbId", request.getKbId());
        return objectMapper.writeValueAsString(payload);
    }

    private Map<String, String> toMap(ChatStreamMessageDTO message) {
        Map<String, String> data = new HashMap<>();
        data.put("role", message.getRole());
        data.put("content", message.getContent());
        return data;
    }
}
