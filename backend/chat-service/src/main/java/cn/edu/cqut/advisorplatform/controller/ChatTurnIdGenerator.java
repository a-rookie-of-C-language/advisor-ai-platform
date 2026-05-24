package cn.edu.cqut.advisorplatform.controller;

import cn.edu.cqut.advisorplatform.dto.request.ChatStreamMessageDTO;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

class ChatTurnIdGenerator {

  String build(ChatStreamRequestDTO request, Long userId) {
    StringBuilder normalized = new StringBuilder();
    normalized.append(userId == null ? 0 : userId).append('|');
    normalized.append(request.getSessionId() == null ? 0 : request.getSessionId()).append('|');
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
}
