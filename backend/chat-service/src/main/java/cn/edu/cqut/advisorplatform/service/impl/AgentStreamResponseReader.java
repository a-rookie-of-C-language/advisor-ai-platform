package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class AgentStreamResponseReader {

  private final AgentStreamEventCollector streamEventCollector;
  private final AgentProxyTransportSupport transportSupport;
  private final boolean debugStream;
  private final long firstChunkTimeoutMs;

  AgentStreamResponseReader(
      AgentStreamEventCollector streamEventCollector,
      AgentProxyTransportSupport transportSupport,
      boolean debugStream,
      long firstChunkTimeoutMs) {
    this.streamEventCollector = streamEventCollector;
    this.transportSupport = transportSupport;
    this.debugStream = debugStream;
    this.firstChunkTimeoutMs = firstChunkTimeoutMs;
  }

  ChatStreamProxyResult read(
      InputStream responseBody,
      OutputStream outputStream,
      Long sessionId,
      Long userId,
      long startAt)
      throws IOException {
    StringBuilder sseBuffer = new StringBuilder();
    StringBuilder deltaPreview = new StringBuilder();
    StringBuilder assistantText = new StringBuilder();
    AtomicInteger deltaCount = new AtomicInteger();
    AtomicBoolean firstDeltaLogged = new AtomicBoolean(false);
    AtomicBoolean sawDoneEvent = new AtomicBoolean(false);
    AtomicBoolean sawErrorEvent = new AtomicBoolean(false);
    List<ChatMessageDO.SourceReference> sources = new ArrayList<>();
    List<ChatMessageDO.StreamEventRecord> events = new ArrayList<>();

    if (debugStream) {
      log.info("debug_stream java start: sessionId={}, userId={}", sessionId, userId);
    }

    try (InputStream bodyStream = responseBody) {
      AgentFirstChunkTimeoutGuard firstChunkTimeoutGuard =
          new AgentFirstChunkTimeoutGuard(bodyStream, transportSupport, firstChunkTimeoutMs);
      firstChunkTimeoutGuard.start();
      try {
        ChatStreamProxyResult clientDisconnectedResult =
            readLoop(
                bodyStream,
                outputStream,
                sseBuffer,
                deltaPreview,
                assistantText,
                deltaCount,
                firstDeltaLogged,
                firstChunkTimeoutGuard,
                sawDoneEvent,
                sawErrorEvent,
                sources,
                events,
                startAt);
        if (clientDisconnectedResult != null) {
          return clientDisconnectedResult;
        }
      } finally {
        firstChunkTimeoutGuard.cancel();
      }
    } finally {
      logDebugSummary(deltaCount.get(), sawDoneEvent, sawErrorEvent, deltaPreview);
    }

    validateDeltaCount(deltaCount.get(), sawDoneEvent, sawErrorEvent, startAt);
    log.info(
        "agent_proxy done, deltas={}, answerLen={}, finishReason={}, sawDone={}, sawError={}, elapsedMs={}",
        deltaCount.get(),
        assistantText.length(),
        finishReason(sawDoneEvent, sawErrorEvent),
        sawDoneEvent.get(),
        sawErrorEvent.get(),
        transportSupport.elapsedSince(startAt));

    return new ChatStreamProxyResult(assistantText.toString(), sources, events);
  }

  private ChatStreamProxyResult readLoop(
      InputStream bodyStream,
      OutputStream outputStream,
      StringBuilder sseBuffer,
      StringBuilder deltaPreview,
      StringBuilder assistantText,
      AtomicInteger deltaCount,
      AtomicBoolean firstDeltaLogged,
      AgentFirstChunkTimeoutGuard firstChunkTimeoutGuard,
      AtomicBoolean sawDoneEvent,
      AtomicBoolean sawErrorEvent,
      List<ChatMessageDO.SourceReference> sources,
      List<ChatMessageDO.StreamEventRecord> events,
      long startAt)
      throws IOException {
    byte[] buffer = new byte[8192];
    int read;
    try {
      while ((read = bodyStream.read(buffer)) != -1) {
        firstChunkTimeoutGuard.markFirstByte(startAt);
        String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
        sseBuffer.append(chunk);

        int before = deltaCount.get();
        deltaCount.addAndGet(
            streamEventCollector.collect(
                sseBuffer,
                deltaPreview,
                assistantText,
                sources,
                events,
                sawDoneEvent,
                sawErrorEvent));
        logFirstDelta(deltaCount.get(), firstDeltaLogged, before, startAt);
        ChatStreamProxyResult clientDisconnectedResult =
            writeToClient(outputStream, buffer, read, assistantText, sources, events);
        if (clientDisconnectedResult != null) {
          return clientDisconnectedResult;
        }
      }
    } catch (IOException io) {
      if (firstChunkTimeoutGuard.isTimedOut()) {
        throw new IOException("agent first chunk timeout after " + firstChunkTimeoutMs + "ms", io);
      }
      throw io;
    }
    return null;
  }

  private void logFirstDelta(
      int deltaCount, AtomicBoolean firstDeltaLogged, int before, long startAt) {
    if (deltaCount > before && firstDeltaLogged.compareAndSet(false, true)) {
      log.info("agent_proxy first_chunk, elapsedMs={}", transportSupport.elapsedSince(startAt));
    }
  }

  private ChatStreamProxyResult writeToClient(
      OutputStream outputStream,
      byte[] buffer,
      int read,
      StringBuilder assistantText,
      List<ChatMessageDO.SourceReference> sources,
      List<ChatMessageDO.StreamEventRecord> events)
      throws IOException {
    if (outputStream == null) {
      return null;
    }
    try {
      outputStream.write(buffer, 0, read);
      outputStream.flush();
    } catch (IOException io) {
      if (transportSupport.isClientAbort(io)) {
        log.warn(
            "agent_proxy client_disconnected, reason={}", LogTraceUtil.preview(io.getMessage()));
        return new ChatStreamProxyResult(
            assistantText.toString(), List.copyOf(sources), List.copyOf(events));
      }
      throw io;
    }
    return null;
  }

  private void validateDeltaCount(
      int deltaCount, AtomicBoolean sawDoneEvent, AtomicBoolean sawErrorEvent, long startAt) {
    if (deltaCount > 0) {
      return;
    }
    String finishReason = finishReason(sawDoneEvent, sawErrorEvent);
    log.warn(
        "agent_proxy invalid_stream_no_delta, finishReason={}, sawDone={}, sawError={}, elapsedMs={}",
        finishReason,
        sawDoneEvent.get(),
        sawErrorEvent.get(),
        transportSupport.elapsedSince(startAt));
    throw new BadRequestException("agent stream failed: no delta");
  }

  private void logDebugSummary(
      int deltaCount,
      AtomicBoolean sawDoneEvent,
      AtomicBoolean sawErrorEvent,
      StringBuilder deltaPreview) {
    if (!debugStream) {
      return;
    }
    log.info(
        "debug_stream java done: deltas={}, sawDone={}, sawError={}, answer_preview={}",
        deltaCount,
        sawDoneEvent.get(),
        sawErrorEvent.get(),
        deltaPreview);
  }

  private String finishReason(AtomicBoolean sawDoneEvent, AtomicBoolean sawErrorEvent) {
    return sawDoneEvent.get() ? "sys_done" : (sawErrorEvent.get() ? "sys_error" : "stream_closed");
  }
}
