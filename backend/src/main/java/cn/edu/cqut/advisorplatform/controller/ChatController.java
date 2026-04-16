package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
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
            @RequestBody Map<String, String> body) {
        String userContent = body.getOrDefault("content", "");
        return ApiResponseDTO.success(Map.of(
                "id", System.currentTimeMillis(),
                "role", "assistant",
                "content", "这是来自后端的 mock 回答，您的问题是：" + userContent,
                "sources", List.of()
        ));
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
                saveTurnQuietly(request.getSessionId(), currentUser.getId(), userText, assistantText);
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(body);
    }

    private void saveTurnQuietly(Long sessionId, Long userId, String userText, String assistantText) {
        try {
            chatMessageService.saveTurn(sessionId, userId, userText, assistantText);
        } catch (Exception e) {
            log.warn("save chat turn failed, sessionId={}, userId={}, error={}", sessionId, userId, e.getMessage());
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
