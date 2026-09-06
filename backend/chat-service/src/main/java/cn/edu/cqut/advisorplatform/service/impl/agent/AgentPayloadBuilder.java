package cn.edu.cqut.advisorplatform.service.impl.agent;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dto.request.chat.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class AgentPayloadBuilder {

  private final ObjectMapper objectMapper;

  AgentPayloadBuilder(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  String buildAgentPayload(ChatStreamRequestDTO request, Long userId) throws IOException {
    List<Map<String, String>> messages = buildMessages(request, "agent stream failed");

    Map<String, Object> payload = new HashMap<>();
    payload.put("messages", messages);
    payload.put("userId", userId);
    payload.put("sessionId", request.getSessionId());
    payload.put("turnId", LogTraceUtil.get(LogTraceUtil.TURN_ID));
    payload.put("traceId", LogTraceUtil.get(LogTraceUtil.TRACE_ID));
    return objectMapper.writeValueAsString(payload);
  }

  String buildAiGatewayPayload(ChatStreamRequestDTO request, String model) throws IOException {
    List<Map<String, String>> messages = buildMessages(request, "ai gateway stream failed");

    Map<String, Object> payload = new HashMap<>();
    payload.put("model", model);
    payload.put("messages", messages);
    return objectMapper.writeValueAsString(payload);
  }

  private List<Map<String, String>> buildMessages(
      ChatStreamRequestDTO request, String errorPrefix) {
    List<Map<String, String>> messages =
        request.getMessages().stream()
            .filter(
                message ->
                    message != null && message.getRole() != null && message.getContent() != null)
            .map(message -> toMap(message.getRole(), message.getContent()))
            .filter(message -> !message.get("content").isBlank())
            .toList();

    if (messages.isEmpty()) {
      throw new BadRequestException(errorPrefix + ": no valid messages");
    }
    return messages;
  }

  private Map<String, String> toMap(String role, String content) {
    Map<String, String> data = new HashMap<>();
    data.put("role", role.trim());
    data.put("content", content.trim());
    return data;
  }
}
