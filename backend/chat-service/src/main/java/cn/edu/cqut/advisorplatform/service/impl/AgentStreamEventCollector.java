package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

class AgentStreamEventCollector {

  private static final int DEBUG_PREVIEW_LIMIT = 200;
  private static final int MAX_PERSISTED_EVENTS = 80;

  private final SseEventParser sseEventParser;
  private final boolean debugStream;

  AgentStreamEventCollector(SseEventParser sseEventParser, boolean debugStream) {
    this.sseEventParser = sseEventParser;
    this.debugStream = debugStream;
  }

  int collect(
      StringBuilder sseBuffer,
      StringBuilder deltaPreview,
      StringBuilder assistantText,
      List<ChatMessageDO.SourceReference> sources,
      List<ChatMessageDO.StreamEventRecord> events,
      AtomicBoolean sawDoneEvent,
      AtomicBoolean sawErrorEvent) {
    int count = 0;
    int blockEnd;
    while ((blockEnd = sseBuffer.indexOf("\n\n")) >= 0) {
      String block = sseBuffer.substring(0, blockEnd);
      sseBuffer.delete(0, blockEnd + 2);
      String eventName = sseEventParser.extractEventName(block);
      collectControlEvent(eventName, sawDoneEvent, sawErrorEvent);
      collectSources(eventName, block, sources);
      collectPersistentEvent(eventName, block, events);

      String delta = sseEventParser.extractDelta(block);
      if (delta == null || delta.isBlank()) {
        continue;
      }
      count++;
      assistantText.append(delta);
      appendDebugPreview(deltaPreview, delta);
    }
    return count;
  }

  private void collectControlEvent(
      String eventName, AtomicBoolean sawDoneEvent, AtomicBoolean sawErrorEvent) {
    if ("sys_done".equals(eventName)) {
      sawDoneEvent.set(true);
    } else if ("sys_error".equals(eventName)) {
      sawErrorEvent.set(true);
    }
  }

  private void collectSources(
      String eventName, String block, List<ChatMessageDO.SourceReference> sources) {
    if (!"sources".equals(eventName) && !"tool_result".equals(eventName)) {
      return;
    }
    List<ChatMessageDO.SourceReference> extractedSources = sseEventParser.extractSources(block);
    if ("sources".equals(eventName) || !extractedSources.isEmpty()) {
      sources.clear();
      sources.addAll(extractedSources);
    }
  }

  private void collectPersistentEvent(
      String eventName, String block, List<ChatMessageDO.StreamEventRecord> events) {
    if (!shouldPersistEvent(eventName) || events.size() >= MAX_PERSISTED_EVENTS) {
      return;
    }
    ChatMessageDO.StreamEventRecord record =
        sseEventParser.extractStreamEventRecord(eventName, block);
    if (record != null) {
      events.add(record);
    }
  }

  private void appendDebugPreview(StringBuilder deltaPreview, String delta) {
    if (!debugStream || deltaPreview.length() >= DEBUG_PREVIEW_LIMIT) {
      return;
    }
    int remain = DEBUG_PREVIEW_LIMIT - deltaPreview.length();
    deltaPreview.append(delta, 0, Math.min(remain, delta.length()));
  }

  private boolean shouldPersistEvent(String eventName) {
    return switch (eventName) {
      case "tool_use",
              "tool_result",
              "tool_error",
              "sys_intent_route",
              "sys_tool_plan",
              "sys_rag_force",
              "risk_alert" ->
          true;
      default -> false;
    };
  }
}
