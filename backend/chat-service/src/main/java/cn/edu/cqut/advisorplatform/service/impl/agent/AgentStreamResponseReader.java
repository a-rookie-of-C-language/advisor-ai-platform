package cn.edu.cqut.advisorplatform.service.impl.agent;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class AgentStreamResponseReader {

  private final AgentProxyTransportSupport transportSupport;
  private final AgentStreamReadLoop readLoop;
  private final boolean debugStream;
  private final long firstChunkTimeoutMs;

  AgentStreamResponseReader(
      AgentStreamEventCollector streamEventCollector,
      AgentProxyTransportSupport transportSupport,
      boolean debugStream,
      long firstChunkTimeoutMs) {
    this.transportSupport = transportSupport;
    this.readLoop =
        new AgentStreamReadLoop(
            streamEventCollector, transportSupport, new AgentStreamClientWriter(transportSupport));
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
    AgentStreamReadState state = new AgentStreamReadState();

    if (debugStream) {
      log.info("debug_stream java start: sessionId={}, userId={}", sessionId, userId);
    }

    try (InputStream bodyStream = responseBody) {
      AgentFirstChunkTimeoutGuard firstChunkTimeoutGuard =
          new AgentFirstChunkTimeoutGuard(bodyStream, transportSupport, firstChunkTimeoutMs);
      firstChunkTimeoutGuard.start();
      try {
        ChatStreamProxyResult clientDisconnectedResult =
            readLoop.read(
                bodyStream,
                outputStream,
                firstChunkTimeoutGuard,
                state,
                startAt,
                firstChunkTimeoutMs);
        if (clientDisconnectedResult != null) {
          return clientDisconnectedResult;
        }
      } finally {
        firstChunkTimeoutGuard.cancel();
      }
    } finally {
      logDebugSummary(state);
    }

    validateDeltaCount(
        state.deltaCount().get(), state.sawDoneEvent(), state.sawErrorEvent(), startAt);
    log.info(
        "agent_proxy done, deltas={}, answerLen={}, finishReason={}, sawDone={}, sawError={}, elapsedMs={}, transfer={}",
        state.deltaCount().get(),
        state.assistantText().length(),
        finishReason(state.sawDoneEvent(), state.sawErrorEvent()),
        state.sawDoneEvent().get(),
        state.sawErrorEvent().get(),
        transportSupport.elapsedSince(startAt),
        readLoop.getClientWriterMetricsSummary());

    return new ChatStreamProxyResult(
        state.assistantText().toString(), state.sources(), state.events());
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

  private void logDebugSummary(AgentStreamReadState state) {
    if (!debugStream) {
      return;
    }
    log.info(
        "debug_stream java done: deltas={}, sawDone={}, sawError={}, answer_preview={}",
        state.deltaCount().get(),
        state.sawDoneEvent().get(),
        state.sawErrorEvent().get(),
        state.deltaPreview());
  }

  private String finishReason(AtomicBoolean sawDoneEvent, AtomicBoolean sawErrorEvent) {
    return sawDoneEvent.get() ? "sys_done" : (sawErrorEvent.get() ? "sys_error" : "stream_closed");
  }
}
