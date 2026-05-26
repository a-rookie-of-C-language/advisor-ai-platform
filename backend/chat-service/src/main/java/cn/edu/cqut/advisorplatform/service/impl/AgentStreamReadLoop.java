package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
class AgentStreamReadLoop {

  private final AgentStreamEventCollector streamEventCollector;
  private final AgentProxyTransportSupport transportSupport;
  private final AgentStreamClientWriter clientWriter;

  ChatStreamProxyResult read(
      InputStream bodyStream,
      OutputStream outputStream,
      AgentFirstChunkTimeoutGuard firstChunkTimeoutGuard,
      AgentStreamReadState state,
      long startAt,
      long firstChunkTimeoutMs)
      throws IOException {
    byte[] buffer = new byte[8192];
    int read;
    try {
      while ((read = bodyStream.read(buffer)) != -1) {
        firstChunkTimeoutGuard.markFirstByte(startAt);
        String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
        state.sseBuffer().append(chunk);

        int before = state.deltaCount().get();
        state
            .deltaCount()
            .addAndGet(
                streamEventCollector.collect(
                    state.sseBuffer(),
                    state.deltaPreview(),
                    state.assistantText(),
                    state.sources(),
                    state.events(),
                    state.sawDoneEvent(),
                    state.sawErrorEvent()));
        logFirstDelta(state.deltaCount().get(), state.firstDeltaLogged(), before, startAt);
        ChatStreamProxyResult clientDisconnectedResult =
            clientWriter.write(
                outputStream, buffer, read, state.assistantText(), state.sources(), state.events());
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
}
