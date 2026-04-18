package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.annotation.Auditable;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.AuditLogDO;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.service.ChatService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.PatchMapping;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private static final String TRACE_HEADER = "X-Trace-Id";
    private static final String ASSISTANT_ERROR_PLACEHOLDER = "\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";

    private final AgentProxyService agentProxyService;
    private final ChatService chatService;
    private final ChatMessageService chatMessageService;

    @GetMapping("/sessions")
    public ApiResponseDTO<List<Map<String, Object>>> listSessions(@AuthenticationPrincipal @Nullable UserDO currentUser) {
        return ApiResponseDTO.success(chatService.listSessions(currentUser));
    }

    @PostMapping("/sessions")
    public ApiResponseDTO<Map<String, Object>> createSession(@AuthenticationPrincipal @Nullable UserDO currentUser) {
        return ApiResponseDTO.success(chatService.createSession(currentUser));
    }

    @DeleteMapping("/sessions/{id}")
    public ApiResponseDTO<Void> deleteSession(@PathVariable Long id, @AuthenticationPrincipal @Nullable UserDO currentUser) {
        chatService.deleteSession(id, currentUser);
        return ApiResponseDTO.success();
    }

    @PatchMapping("/sessions/{id}/kb")
    public ApiResponseDTO<Map<String, Object>> updateSessionKb(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal @Nullable UserDO currentUser
    ) {
        Object kbIdValue = body == null ? null : body.get("kbId");
        if (!(kbIdValue instanceof Number kbIdNumber)) {
            throw new BadRequestException("kbId is required");
        }
        return ApiResponseDTO.success(chatService.updateSessionKb(id, kbIdNumber.longValue(), currentUser));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponseDTO<List<Map<String, Object>>> listMessages(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal @Nullable UserDO currentUser
    ) {
        return ApiResponseDTO.success(chatService.listMessages(sessionId, currentUser));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public ApiResponseDTO<Map<String, Object>> sendMessage(
            @PathVariable Long sessionId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal @Nullable UserDO currentUser
    ) throws java.io.IOException {
        if (currentUser == null || currentUser.getId() == null) {
            throw new ForbiddenException("\u672a\u767b\u5f55\u6216\u767b\u5f55\u5df2\u5931\u6548");
        }

        String userContent = body.getOrDefault("content", "").trim();
        if (userContent.isBlank()) {
            throw new BadRequestException("content is blank");
        }

        long startAt = System.currentTimeMillis();
        long kbId = chatService.getSessionKbId(sessionId, currentUser);
        List<ChatStreamMessageDTO> history = buildHistoryMessages(sessionId, currentUser, userContent);

        ChatStreamRequestDTO request = new ChatStreamRequestDTO();
        request.setSessionId(sessionId);
        request.setKbId(kbId);
        request.setMessages(history);

        String turnId = buildTurnId(request, currentUser.getId());
        String traceId = resolveTraceIdFromRequest();

        LogTraceUtil.put(traceId, sessionId, turnId, currentUser.getId());
        try {
            log.info("chat_send start, kbId={}, messageCount={}, userLen={}, userPreview={}",
                    kbId,
                    history.size(),
                    userContent.length(),
                    LogTraceUtil.preview(userContent));

            String cached = chatMessageService.findAssistantContent(sessionId, currentUser.getId(), turnId);
            if (cached != null && !cached.isBlank()) {
                log.info("chat_send cache_hit, assistantLen={}, elapsedMs={}", cached.length(), elapsedSince(startAt));
                return ApiResponseDTO.success(buildAssistantResponse(cached, List.of()));
            }

            String assistantText;
            List<ChatMessageDO.SourceReference> sources = List.of();
            try {
                ChatStreamProxyResult result = agentProxyService.proxyChatOnce(request, currentUser.getId());
                assistantText = result == null ? "" : result.getAssistantText();
                sources = result == null || result.getSources() == null ? List.of() : result.getSources();
            } catch (Exception e) {
                String errorMessage = safeMessage(e);
                assistantText = "请求失败：" + errorMessage;
                log.warn("chat_send proxy_failed, reason={}", LogTraceUtil.preview(errorMessage));
            }

            if (assistantText == null || assistantText.trim().isBlank()) {
                assistantText = ASSISTANT_ERROR_PLACEHOLDER;
            }

            if (sources == null || sources.isEmpty()) {
                chatMessageService.saveTurn(sessionId, currentUser.getId(), turnId, userContent, assistantText);
            } else {
                chatMessageService.saveTurn(sessionId, currentUser.getId(), turnId, userContent, assistantText, sources);
            }
            log.info("chat_send done, assistantLen={}, elapsedMs={}", assistantText.length(), elapsedSince(startAt));
            return ApiResponseDTO.success(buildAssistantResponse(assistantText, sources));
        } finally {
            LogTraceUtil.clear();
        }
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Auditable(module = AuditLogDO.AuditModule.CHAT, action = AuditLogDO.AuditAction.STREAM_CHAT, logRequestParams = true, logResponseData = false)
    public ResponseEntity<StreamingResponseBody> streamChat(
            @Valid @RequestBody ChatStreamRequestDTO request,
            @AuthenticationPrincipal @Nullable UserDO currentUser
    ) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new ForbiddenException("\u672a\u767b\u5f55\u6216\u767b\u5f55\u5df2\u5931\u6548");
        }

        long sessionKbId = chatService.getSessionKbId(request.getSessionId(), currentUser);
        request.setKbId(sessionKbId);

        String userText = extractLastUserMessage(request);
        String turnId = buildTurnId(request, currentUser.getId());
        String traceId = resolveTraceIdFromRequest();

        log.info("chat_stream accepted, traceId={}, sessionId={}, turnId={}, userId={}, kbId={}, userLen={}, userPreview={}",
                traceId,
                request.getSessionId(),
                turnId,
                currentUser.getId(),
                sessionKbId,
                userText.length(),
                LogTraceUtil.preview(userText));

        StreamingResponseBody body = outputStream -> {
            long startAt = System.currentTimeMillis();
            LogTraceUtil.put(traceId, request.getSessionId(), turnId, currentUser.getId());
            String assistantText = ASSISTANT_ERROR_PLACEHOLDER;
            List<ChatMessageDO.SourceReference> sources = List.of();
            String finishReason = "stop";
            try {
                log.info("chat_stream start");
                ChatStreamProxyResult proxyResult = agentProxyService.proxyChatStream(request, currentUser.getId(), outputStream);
                if (proxyResult != null && proxyResult.getAssistantText() != null && !proxyResult.getAssistantText().isBlank()) {
                    assistantText = proxyResult.getAssistantText().trim();
                }
                if (proxyResult != null && proxyResult.getSources() != null) {
                    sources = proxyResult.getSources();
                }
                log.info("chat_stream proxy_done, assistantLen={}, elapsedMs={}", assistantText.length(), elapsedSince(startAt));
            } catch (Exception ex) {
                String errorMessage = safeMessage(ex);
                finishReason = "error";
                writeErrorEvent(outputStream, errorMessage);
                log.warn("chat_stream proxy_failed, reason={}", LogTraceUtil.preview(errorMessage));
                assistantText = "请求失败：" + errorMessage;
            } finally {
                writeDoneEvent(outputStream, finishReason, turnId, traceId);
                saveTurnQuietly(request.getSessionId(), currentUser.getId(), turnId, userText, assistantText, sources);
                log.info("chat_stream done, assistantLen={}, elapsedMs={}", assistantText.length(), elapsedSince(startAt));
                LogTraceUtil.clear();
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(body);
    }

    private Map<String, Object> buildAssistantResponse(String assistantText, List<ChatMessageDO.SourceReference> sources) {
        return Map.of(
                "id", System.currentTimeMillis(),
                "role", "assistant",
                "content", assistantText,
                "sources", sources == null ? List.of() : sources
        );
    }

    private List<ChatStreamMessageDTO> buildHistoryMessages(Long sessionId, UserDO currentUser, String userContent) {
        List<Map<String, Object>> persisted = chatService.listMessages(sessionId, currentUser);
        List<ChatStreamMessageDTO> result = new ArrayList<>();

        for (Map<String, Object> row : persisted) {
            Object roleObj = row.get("role");
            Object contentObj = row.get("content");
            if (roleObj == null || contentObj == null) {
                continue;
            }
            String role = String.valueOf(roleObj).trim();
            String content = String.valueOf(contentObj).trim();
            if (content.isBlank()) {
                continue;
            }
            if (!"user".equals(role) && !"assistant".equals(role) && !"system".equals(role)) {
                continue;
            }
            ChatStreamMessageDTO dto = new ChatStreamMessageDTO();
            dto.setRole(role);
            dto.setContent(content);
            result.add(dto);
        }

        ChatStreamMessageDTO user = new ChatStreamMessageDTO();
        user.setRole("user");
        user.setContent(userContent);
        result.add(user);
        return result;
    }

    private void saveTurnQuietly(
            Long sessionId,
            Long userId,
            String turnId,
            String userText,
            String assistantText,
            List<ChatMessageDO.SourceReference> sources
    ) {
        try {
            if (sources == null || sources.isEmpty()) {
                chatMessageService.saveTurn(sessionId, userId, turnId, userText, assistantText);
            } else {
                chatMessageService.saveTurn(sessionId, userId, turnId, userText, assistantText, sources);
            }
        } catch (Exception e) {
            log.warn("chat_stream save_turn_failed, reason={}", LogTraceUtil.preview(e.getMessage()));
        }
    }

    private String extractLastUserMessage(ChatStreamRequestDTO request) {
        if (request == null || request.getMessages() == null || request.getMessages().isEmpty()) {
            return "";
        }
        for (int i = request.getMessages().size() - 1; i >= 0; i--) {
            ChatStreamMessageDTO message = request.getMessages().get(i);
            if (message == null || message.getRole() == null || message.getContent() == null) {
                continue;
            }
            if ("user".equalsIgnoreCase(message.getRole().trim())) {
                return message.getContent().trim();
            }
        }
        return "";
    }

    private String buildTurnId(ChatStreamRequestDTO request, Long userId) {
        StringBuilder normalized = new StringBuilder();
        normalized.append(userId == null ? 0 : userId).append('|');
        normalized.append(request.getSessionId() == null ? 0 : request.getSessionId()).append('|');
        normalized.append(request.getKbId() == null ? 0 : request.getKbId()).append('|');

        if (request.getMessages() != null) {
            for (ChatStreamMessageDTO message : request.getMessages()) {
                if (message == null) {
                    continue;
                }
                String role = message.getRole() == null ? "" : message.getRole().trim().toLowerCase();
                String content = message.getContent() == null ? "" : message.getContent().trim();
                normalized.append(role).append(':').append(content).append('|');
            }
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalized.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private String safeJson(@Nullable String raw) {
        if (raw == null || raw.isBlank()) {
            return "stream failed";
        }
        return raw.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", " ")
                .replace("\n", " ");
    }

    private String safeMessage(Exception exception) {
        String message = exception.getMessage();
        return message == null || message.isBlank() ? ASSISTANT_ERROR_PLACEHOLDER : message;
    }

    private void writeErrorEvent(java.io.OutputStream outputStream, @Nullable String rawMessage) {
        String message = safeJson(rawMessage);
        String sseError = "event:error\ndata:{\"message\":\"" + message + "\"}\n\n";
        try {
            outputStream.write(sseError.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (Exception ignored) {
            // client might already disconnect
        }
    }

    private void writeDoneEvent(java.io.OutputStream outputStream, String finishReason, String turnId, String traceId) {
        String safeFinishReason = safeJson(finishReason);
        String safeTurnId = safeJson(turnId);
        String safeTraceId = safeJson(traceId);
        String sseDone = "event:done\ndata:{\"finish_reason\":\"" + safeFinishReason
                + "\",\"turnId\":\"" + safeTurnId
                + "\",\"traceId\":\"" + safeTraceId + "\"}\n\n";
        try {
            outputStream.write(sseDone.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (Exception ignored) {
            // client might already disconnect
        }
    }

    private String resolveTraceIdFromRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return LogTraceUtil.resolveTraceId(null);
        }
        HttpServletRequest request = attributes.getRequest();
        return LogTraceUtil.resolveTraceId(request == null ? null : request.getHeader(TRACE_HEADER));
    }

    private long elapsedSince(long startAt) {
        return Math.max(0L, System.currentTimeMillis() - startAt);
    }
}
