package cn.edu.cqut.advisorplatform.controller.chat;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

class ChatControllerSupport {

  Map<String, Object> buildAssistantResponse(
      String assistantText, List<SourceReference> sources, List<StreamEventRecord> events) {
    return Map.of(
        "id",
        System.currentTimeMillis(),
        "role",
        "assistant",
        "content",
        assistantText,
        "sources",
        sources == null ? List.of() : sources,
        "events",
        events == null ? List.of() : events);
  }

  List<ChatStreamMessageDTO> buildHistoryMessages(
      List<Map<String, Object>> persisted, String userContent) {
    List<ChatStreamMessageDTO> result = new ArrayList<>();

    if (persisted != null) {
      for (Map<String, Object> row : persisted) {
        ChatStreamMessageDTO dto = toHistoryMessage(row);
        if (dto != null) {
          result.add(dto);
        }
      }
    }

    ChatStreamMessageDTO user = new ChatStreamMessageDTO();
    user.setRole("user");
    user.setContent(userContent);
    result.add(user);
    return result;
  }

  String extractLastUserMessage(ChatStreamRequestDTO request) {
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

  String safeMessage(Exception exception, String fallback) {
    String message = exception.getMessage();
    return message == null || message.isBlank() ? fallback : message;
  }

  long elapsedSince(long startAt) {
    return Math.max(0L, System.currentTimeMillis() - startAt);
  }

  private ChatStreamMessageDTO toHistoryMessage(Map<String, Object> row) {
    if (row == null) {
      return null;
    }
    Object roleObj = row.get("role");
    Object contentObj = row.get("content");
    if (roleObj == null || contentObj == null) {
      return null;
    }
    String role = String.valueOf(roleObj).trim();
    String content = String.valueOf(contentObj).trim();
    if (content.isBlank()) {
      return null;
    }
    if (!"user".equals(role) && !"assistant".equals(role) && !"system".equals(role)) {
      return null;
    }
    ChatStreamMessageDTO dto = new ChatStreamMessageDTO();
    dto.setRole(role);
    dto.setContent(content);
    return dto;
  }
}
