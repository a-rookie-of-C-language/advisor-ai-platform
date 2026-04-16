package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.dto.response.ApiResponseDTO;
import cn.edu.cqut.advisorplatform.entity.UserDO;
import cn.edu.cqut.advisorplatform.exception.ForbiddenException;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final AgentProxyService agentProxyService;

    @GetMapping("/sessions")
    public ApiResponseDTO<List<Map<String, Object>>> listSessions() {
        return ApiResponseDTO.success(List.of(
                Map.of("id", 1, "title", "心理危机干预方法", "updatedAt", "2026-04-11 10:00"),
                Map.of("id", 2, "title", "课程思政元素融入", "updatedAt", "2026-04-11 09:00")
        ));
    }

    @PostMapping("/sessions")
    public ApiResponseDTO<Map<String, Object>> createSession() {
        return ApiResponseDTO.success(Map.of(
                "id", System.currentTimeMillis(),
                "title", "新对话",
                "updatedAt", LocalDateTime.now().toString()
        ));
    }

    @DeleteMapping("/sessions/{id}")
    public ApiResponseDTO<Void> deleteSession(@PathVariable Long id) {
        return ApiResponseDTO.success();
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponseDTO<List<Map<String, Object>>> listMessages(@PathVariable Long sessionId) {
        return ApiResponseDTO.success(List.of(
                Map.of("id", 1, "role", "user", "content", "如何处理学生心理危机事件？"),
                Map.of("id", 2, "role", "assistant", "content", "处理学生心理危机事件需要遵循及时响应、风险评估、专业转介和持续跟踪。")
        ));
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

        StreamingResponseBody body = outputStream ->
                agentProxyService.proxyChatStream(request, currentUser.getId(), outputStream);

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(body);
    }
}
