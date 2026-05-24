package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

class SseEventParser {

  private static final TypeReference<Map<String, Object>> STREAM_EVENT_PAYLOAD_TYPE =
      new TypeReference<>() {};

  private final ObjectMapper objectMapper;

  SseEventParser(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  String extractEventName(String sseBlock) {
    String[] lines = sseBlock.split("\n");
    String event = "message";
    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.startsWith("event:")) {
        event = trimmed.substring(6).trim();
        break;
      }
    }
    return event;
  }

  ChatMessageDO.StreamEventRecord extractStreamEventRecord(String eventName, String sseBlock) {
    String dataJson = extractDataJson(sseBlock);
    if (dataJson.isBlank()) {
      return null;
    }
    try {
      JsonNode node = objectMapper.readTree(dataJson);
      JsonNode payloadNode = node.has("payload") ? node.path("payload") : node;
      ChatMessageDO.StreamEventRecord record = new ChatMessageDO.StreamEventRecord();
      record.setEvent(eventName);
      record.setSource(node.path("source").asText(""));
      record.setTraceId(node.path("trace_id").asText(""));
      if (node.has("timestamp") && node.path("timestamp").canConvertToLong()) {
        record.setTimestamp(node.path("timestamp").asLong());
      }
      record.setPayload(objectMapper.convertValue(payloadNode, STREAM_EVENT_PAYLOAD_TYPE));
      return record;
    } catch (Exception e) {
      return null;
    }
  }

  String extractDelta(String sseBlock) {
    String[] lines = sseBlock.split("\n");
    String event = "message";
    StringBuilder dataBuilder = new StringBuilder();

    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.startsWith("event:")) {
        event = trimmed.substring(6).trim();
      } else if (trimmed.startsWith("data:")) {
        dataBuilder.append(trimmed.substring(5).trim());
      }
    }

    if (dataBuilder.isEmpty()) {
      return null;
    }

    try {
      JsonNode node = objectMapper.readTree(dataBuilder.toString());
      if ("llm_data".equals(event)) {
        String text = node.path("payload").path("text").asText("");
        if (text.isBlank()) {
          text = node.path("text").asText("");
        }
        return text;
      }
      return null;
    } catch (Exception e) {
      return null;
    }
  }

  List<ChatMessageDO.SourceReference> extractSources(String sseBlock) {
    String[] lines = sseBlock.split("\n");
    String event = "message";
    StringBuilder dataBuilder = new StringBuilder();

    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.startsWith("event:")) {
        event = trimmed.substring(6).trim();
      } else if (trimmed.startsWith("data:")) {
        dataBuilder.append(trimmed.substring(5).trim());
      }
    }

    if (!"sources".equals(event) && !"tool_result".equals(event)) {
      return List.of();
    }
    if (dataBuilder.isEmpty()) {
      return List.of();
    }

    try {
      JsonNode node = objectMapper.readTree(dataBuilder.toString());
      JsonNode payload = node.path("payload");
      JsonNode items =
          "tool_result".equals(event)
              ? payload.path("derived").path("sources")
              : payload.path("items");
      if (items.isMissingNode()) {
        items =
            "tool_result".equals(event) ? node.path("derived").path("sources") : node.path("items");
      }
      if (!items.isArray()) {
        return List.of();
      }
      List<ChatMessageDO.SourceReference> results = new ArrayList<>();
      for (JsonNode item : items) {
        ChatMessageDO.SourceReference source = new ChatMessageDO.SourceReference();
        source.setDocumentId(item.path("id").isMissingNode() ? null : item.path("id").asLong());
        source.setDocName(item.path("docName").asText(""));
        source.setSnippet(item.path("snippet").asText(""));
        results.add(source);
      }
      return results;
    } catch (Exception e) {
      return List.of();
    }
  }

  private String extractDataJson(String sseBlock) {
    String[] lines = sseBlock.split("\n");
    StringBuilder dataBuilder = new StringBuilder();
    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        dataBuilder.append(trimmed.substring(5).trim());
      }
    }
    return dataBuilder.toString();
  }
}
