package cn.edu.cqut.advisorplatform.service.impl.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class AgentPayloadBuilderTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final AgentPayloadBuilder builder = new AgentPayloadBuilder(objectMapper);

  @AfterEach
  void tearDown() {
    LogTraceUtil.clear();
  }

  @Test
  void buildAgentPayload_shouldTrimMessagesAndAttachTraceContext() throws Exception {
    LogTraceUtil.put("trace-1", 1001L, "turn-1", 1L);
    ChatStreamRequestDTO request = requestWithMessages(message(" user ", " hello "));
    request.setSessionId(1001L);
    request.setKbId(2002L);

    JsonNode payload = objectMapper.readTree(builder.buildAgentPayload(request, 1L));

    assertThat(payload.path("userId").asLong()).isEqualTo(1L);
    assertThat(payload.path("sessionId").asLong()).isEqualTo(1001L);
    assertThat(payload.path("kbId").asLong()).isEqualTo(2002L);
    assertThat(payload.path("turnId").asText()).isEqualTo("turn-1");
    assertThat(payload.path("traceId").asText()).isEqualTo("trace-1");
    assertThat(payload.path("messages").get(0).path("role").asText()).isEqualTo("user");
    assertThat(payload.path("messages").get(0).path("content").asText()).isEqualTo("hello");
  }

  @Test
  void buildAiGatewayPayload_shouldRejectBlankMessages() {
    ChatStreamRequestDTO request = requestWithMessages(message("user", "   "));

    assertThatThrownBy(() -> builder.buildAiGatewayPayload(request, "model-a"))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("no valid messages");
  }

  private static ChatStreamRequestDTO requestWithMessages(ChatStreamMessageDTO... messages) {
    ChatStreamRequestDTO request = new ChatStreamRequestDTO();
    request.setMessages(List.of(messages));
    return request;
  }

  private static ChatStreamMessageDTO message(String role, String content) {
    ChatStreamMessageDTO message = new ChatStreamMessageDTO();
    message.setRole(role);
    message.setContent(content);
    return message;
  }
}
