package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.ChatMessageService;
import cn.edu.cqut.advisorplatform.service.ChatService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

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

    private static final String ASSISTANT_ERROR_PLACEHOLDER = "请求失败，请稍后重试。";

    private final AgentProxyService agentProxyService;
    private final ChatService chatService;
    private final ChatMessageService chatMessageService;

    @GetMapping("/sessions")
    public ApiResponseDTO<List<Map<String, Object>>> listSessions(@AuthenticationPrincipal UserDO currentUser) {
        return ApiResponseDTO.success(chatService.listSessions(currentUser));
    }

    @PostMapping("/sessions")
    public ApiResponseDTO<Map<String, Object>> createSession(@AuthenticationPrincipal UserDO currentUser) {
        return ApiResponseDTO.success(chatService.createSession(currentUser));
    }

    @DeleteMapping("/sessions/{id}")
    public ApiResponseDTO<Void> deleteSession(@PathVariable Long id, @AuthenticationPrincipal UserDO currentUser) {
        chatService.deleteSession(id, currentUser);
        return ApiResponseDTO.success();
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponseDTO<List<Map<String, Object>>> listMessages(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal UserDO currentUser
    ) {
        return ApiResponseDTO.success(chatService.listMessages(sessionId, currentUser));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public ApiResponseDTO<Map<String, Object>> sendMessage(
            @PathVariable Long sessionId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDO currentUser
    ) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new ForbiddenException("未登录或登录已失效");
        }

        String userContent = body.getOrDefault("content", "").trim();
        if (userContent.isBlank()) {
            throw new BadRequestException("content is blank");
        }

        long kbId = parseKbId(body.get("kbId"));
        List<ChatStreamMessageDTO> history = buildHistoryMessages(sessionId, currentUser, userContent);

        ChatStreamRequestDTO request = new ChatStreamRequestDTO();
        request.setSessionId(sessionId);
        request.setKbId(kbId);
        request.setMessages(history);

        String turnId = buildTurnId(request, currentUser.getId());
        String cached = chatMessageService.findAssistantContent(sessionId, currentUser.getId(), turnId);
        if (cached != null && !cached.isBlank()) {
            return ApiResponseDTO.success(buildAssistantResponse(cached));
        }

        String assistantText;
        try {
            ChatStreamProxyResult result = agentProxyService.proxyChatOnce(request, currentUser.getId());
            assistantText = result == null ? "" : result.getAssistantText();
        } catch (Exception e) {
            assistantText = "请求失败：" + (e.getMessage() == null ? ASSISTANT_ERROR_PLACEHOLDER : e.getMessage());
        }

        if (assistantText == null || assistantText.trim().isBlank()) {
            assistantText = ASSISTANT_ERROR_PLACEHOLDER;
        }

        chatMessageService.saveTurn(sessionId, currentUser.getId(), turnId, userContent, assistantText);
        return ApiResponseDTO.success(buildAssistantResponse(assistantText));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> streamChat(
            @Valid @RequestBody ChatStreamRequestDTO request,
            @AuthenticationPrincipal UserDO currentUser
    ) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new ForbiddenException("未登录或登录已失效");
        }

        String userText = extractLastUserMessage(request);
        String turnId = buildTurnId(request, currentUser.getId());

        StreamingResponseBody body = outputStream -> {
            String assistantText = ASSISTANT_ERROR_PLACEHOLDER;
            try {
                ChatStreamProxyResult proxyResult = agentProxyService.proxyChatStream(request, currentUser.getId(), outputStream);
                if (proxyResult != null && proxyResult.getAssistantText() != null && !proxyResult.getAssistantText().isBlank()) {
                    assistantText = proxyResult.getAssistantText().trim();
                }
            } catch (Exception ex) {
                String message = safeJson(ex.getMessage());
                String sseError = "event:error\ndata:{\"message\":\"" + message + "\"}\n\n";
                outputStream.write(sseError.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
                log.warn("chat stream proxy failed, sessionId={}, userId={}, error={}",
                        request.getSessionId(), currentUser.getId(), ex.getMessage());
                assistantText = "请求失败：" + (ex.getMessage() == null ? ASSISTANT_ERROR_PLACEHOLDER : ex.getMessage());
            } finally {
                saveTurnQuietly(request.getSessionId(), currentUser.getId(), turnId, userText, assistantText);
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(body);
    }

    private Map<String, Object> buildAssistantResponse(String assistantText) {
        return Map.of(
                "id", System.currentTimeMillis(),
                "role", "assistant",
                "content", assistantText,
                "sources", List.of()
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

    private long parseKbId(String rawKbId) {
        if (rawKbId == null || rawKbId.trim().isEmpty()) {
            return 1L;
        }
        try {
            return Long.parseLong(rawKbId.trim());
        } catch (NumberFormatException e) {
            return 1L;
        }
    }

    private void saveTurnQuietly(Long sessionId, Long userId, String turnId, String userText, String assistantText) {
        try {
            chatMessageService.saveTurn(sessionId, userId, turnId, userText, assistantText);
        } catch (Exception e) {
            log.warn("save chat turn failed, sessionId={}, userId={}, turnId={}, error={}",
                    sessionId, userId, turnId, e.getMessage());
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

    private String safeJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return "stream failed";
        }
        return raw.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", " ")
                .replace("\n", " ");
    }
}
