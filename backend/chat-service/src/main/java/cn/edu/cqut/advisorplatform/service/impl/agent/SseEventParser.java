package cn.edu.cqut.advisorplatform.service.impl.agent;

import cn.edu.cqut.advisorplatform.entity.chat.SourceReference;
import cn.edu.cqut.advisorplatform.entity.chat.StreamEventRecord;
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
    return SseEventBlock.parse(sseBlock).eventName();
  }

  StreamEventRecord extractStreamEventRecord(String eventName, String sseBlock) {
    SseEventBlock block = SseEventBlock.parse(sseBlock);
    if (block.dataJson().isBlank()) {
      return null;
    }
    try {
      JsonNode node = objectMapper.readTree(block.dataJson());
      JsonNode payloadNode = node.has("payload") ? node.path("payload") : node;
      StreamEventRecord record = new StreamEventRecord();
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
    SseEventBlock block = SseEventBlock.parse(sseBlock);
    if (block.dataJson().isEmpty()) {
      return null;
    }

    try {
      JsonNode node = objectMapper.readTree(block.dataJson());
      String eventName = block.eventName();
      if ("llm_data".equals(eventName) || "llm_delta".equals(eventName)) {
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

  List<SourceReference> extractSources(String sseBlock) {
    SseEventBlock block = SseEventBlock.parse(sseBlock);
    if (!"sources".equals(block.eventName()) && !"tool_result".equals(block.eventName())) {
      return List.of();
    }
    if (block.dataJson().isEmpty()) {
      return List.of();
    }

    try {
      JsonNode node = objectMapper.readTree(block.dataJson());
      JsonNode payload = node.path("payload");
      JsonNode items =
          "tool_result".equals(block.eventName())
              ? payload.path("derived").path("sources")
              : payload.path("items");
      if (items.isMissingNode()) {
        items =
            "tool_result".equals(block.eventName())
                ? node.path("derived").path("sources")
                : node.path("items");
      }
      if (!items.isArray()) {
        return List.of();
      }
      List<SourceReference> results = new ArrayList<>();
      for (JsonNode item : items) {
        SourceReference source = new SourceReference();
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
}
