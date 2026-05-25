package cn.edu.cqut.advisorplatform.service.impl;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;

@Slf4j
class AgentFirstChunkTimeoutGuard {

  private static final ScheduledExecutorService FIRST_CHUNK_WATCHDOG =
      Executors.newScheduledThreadPool(
          1,
          runnable -> {
            Thread thread = new Thread(runnable, "agent-proxy-first-chunk-watchdog");
            thread.setDaemon(true);
            return thread;
          });

  private final InputStream bodyStream;
  private final AgentProxyTransportSupport transportSupport;
  private final long firstChunkTimeoutMs;
  private final AtomicBoolean firstChunkReceived = new AtomicBoolean(false);
  private final AtomicBoolean firstChunkTimedOut = new AtomicBoolean(false);
  private ScheduledFuture<?> timeoutFuture;

  AgentFirstChunkTimeoutGuard(
      InputStream bodyStream,
      AgentProxyTransportSupport transportSupport,
      long firstChunkTimeoutMs) {
    this.bodyStream = bodyStream;
    this.transportSupport = transportSupport;
    this.firstChunkTimeoutMs = firstChunkTimeoutMs;
  }

  void start() {
    timeoutFuture =
        FIRST_CHUNK_WATCHDOG.schedule(
            () -> {
              if (!firstChunkReceived.get()) {
                firstChunkTimedOut.set(true);
                closeBodyStream();
              }
            },
            firstChunkTimeoutMs,
            TimeUnit.MILLISECONDS);
  }

  void markFirstByte(long startAt) {
    if (firstChunkReceived.compareAndSet(false, true)) {
      cancel();
      log.info("agent_proxy first_byte, elapsedMs={}", transportSupport.elapsedSince(startAt));
    }
  }

  boolean isTimedOut() {
    return firstChunkTimedOut.get();
  }

  void cancel() {
    if (timeoutFuture != null) {
      timeoutFuture.cancel(false);
    }
  }

  private void closeBodyStream() {
    try {
      bodyStream.close();
    } catch (IOException ignored) {
      // no-op
    }
  }
}
