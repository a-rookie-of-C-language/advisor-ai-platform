package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 对话 Controller（骨架，当前返回 mock 数据）
 * 后续集成 Spring AI + LLM 服务时替换为真实流式实现
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    // ── 会话 ──

    @GetMapping("/sessions")
    public ApiResponse<List<Map<String, Object>>> listSessions() {
        return ApiResponse.success(List.of(
                Map.of("id", 1, "title", "心理危机干预方法", "updatedAt", "2026-04-11 10:00"),
                Map.of("id", 2, "title", "课程思政元素融入", "updatedAt", "2026-04-11 09:00")
        ));
    }

    @PostMapping("/sessions")
    public ApiResponse<Map<String, Object>> createSession() {
        return ApiResponse.success(Map.of(
                "id", System.currentTimeMillis(),
                "title", "新对话",
                "updatedAt", java.time.LocalDateTime.now().toString()
        ));
    }

    @DeleteMapping("/sessions/{id}")
    public ApiResponse<Void> deleteSession(@PathVariable Long id) {
        return ApiResponse.success();
    }

    // ── 消息 ──

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponse<List<Map<String, Object>>> listMessages(@PathVariable Long sessionId) {
        return ApiResponse.success(List.of(
                Map.of("id", 1, "role", "user", "content", "如何处理学生心理危机事件？"),
                Map.of("id", 2, "role", "assistant", "content", "处理学生心理危机事件需要遵循以下步骤……")
        ));
    }

    /**
     * 发送消息（暂为同步接口，后续改为 SSE 流式）
     */
    @PostMapping("/sessions/{sessionId}/messages")
    public ApiResponse<Map<String, Object>> sendMessage(
            @PathVariable Long sessionId,
            @RequestBody Map<String, String> body) {
        String userContent = body.getOrDefault("content", "");
        return ApiResponse.success(Map.of(
                "id", System.currentTimeMillis(),
                "role", "assistant",
                "content", "这是来自后端的 mock 回答，您的问题是：" + userContent,
                "sources", List.of()
        ));
    }
}
