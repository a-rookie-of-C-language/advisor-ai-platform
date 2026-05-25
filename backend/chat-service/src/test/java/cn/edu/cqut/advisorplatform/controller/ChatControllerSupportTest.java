package cn.edu.cqut.advisorplatform.controller;

import static org.assertj.core.api.Assertions.assertThat;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ChatControllerSupportTest {

  private final ChatControllerSupport support = new ChatControllerSupport();

  @Test
  void buildHistoryMessages_shouldKeepValidHistoryAndAppendCurrentUserMessage() {
    List<Map<String, Object>> persisted =
        List.of(
            Map.of("role", "user", "content", " hello "),
            Map.of("role", "assistant", "content", "world"),
            Map.of("role", "tool", "content", "ignored"),
            Map.of("role", "system", "content", "   "));

    List<ChatStreamMessageDTO> result = support.buildHistoryMessages(persisted, "new question");

    assertThat(result).hasSize(3);
    assertThat(result.get(0).getRole()).isEqualTo("user");
    assertThat(result.get(0).getContent()).isEqualTo("hello");
    assertThat(result.get(1).getRole()).isEqualTo("assistant");
    assertThat(result.get(2).getRole()).isEqualTo("user");
    assertThat(result.get(2).getContent()).isEqualTo("new question");
  }

  @Test
  void extractLastUserMessage_shouldReturnTrimmedLastUserContent() {
    ChatStreamMessageDTO assistant = message("assistant", "reply");
    ChatStreamMessageDTO olderUser = message("user", "old");
    ChatStreamMessageDTO latestUser = message(" user ", " latest ");
    ChatStreamRequestDTO request = new ChatStreamRequestDTO();
    request.setMessages(List.of(olderUser, assistant, latestUser));

    assertThat(support.extractLastUserMessage(request)).isEqualTo("latest");
  }

  @Test
  void buildAssistantResponse_shouldDefaultNullCollectionsToEmptyLists() {
    Map<String, Object> response = support.buildAssistantResponse("ok", null, null);

    assertThat(response.get("role")).isEqualTo("assistant");
    assertThat(response.get("content")).isEqualTo("ok");
    assertThat(response.get("sources")).isEqualTo(List.of());
    assertThat(response.get("events")).isEqualTo(List.of());
  }

  @Test
  void safeMessage_shouldUseFallbackWhenExceptionMessageIsBlank() {
    assertThat(support.safeMessage(new RuntimeException(""), "fallback")).isEqualTo("fallback");
    assertThat(support.safeMessage(new RuntimeException("boom"), "fallback")).isEqualTo("boom");
  }

  private ChatStreamMessageDTO message(String role, String content) {
    ChatStreamMessageDTO message = new ChatStreamMessageDTO();
    message.setRole(role);
    message.setContent(content);
    return message;
  }
}
