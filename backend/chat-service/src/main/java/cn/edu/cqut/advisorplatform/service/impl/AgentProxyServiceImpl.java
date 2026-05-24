package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.dto.request.ChatStreamRequestDTO;
import cn.edu.cqut.advisorplatform.entity.ChatMessageDO;
import cn.edu.cqut.advisorplatform.service.AgentProxyService;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections.*;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AgentProxyServiceImpl implements AgentProxyService {

  private static final int DEBUG_PREVIEW_LIMIT = 200;
  private static final String TRACE_HEADER = "X-Trace-Id";
  private static final String TURN_HEADER = "X-Turn-Id";
  private static final ScheduledExecutorService FIRST_CHUNK_WATCHDOG =
      Executors.newScheduledThreadPool(
          1,
          runnable -> {
            Thread thread = new Thread(runnable, "agent-proxy-first-chunk-watchdog");
            thread.setDaemon(true);
            return thread;
          });

  private final AgentPayloadBuilder payloadBuilder;
  private final AgentStreamEventCollector streamEventCollector;
  private final AgentProxyTransportSupport transportSupport = new AgentProxyTransportSupport();
  private final HttpClient httpClient;
  private final String agentBaseUrl;
  private final String agentApiToken;
  private final boolean aiGatewayEnabled;
  private final String aiGatewayBaseUrl;
  private final String aiGatewayApiKey;
  private final String aiGatewayModel;
  private final boolean debugStream;
  private final long requestTimeoutMs;
  private final long firstChunkTimeoutMs;

  public AgentProxyServiceImpl(
      ObjectMapper objectMapper,
      @Value("${advisor.agent.base-url:http://127.0.0.1:8001}") String agentBaseUrl,
      @Value("${advisor.agent.api-token:${MEMORY_API_TOKEN:}}") String agentApiToken,
      @Value("${advisor.ai-gateway.enabled:false}") boolean aiGatewayEnabled,
      @Value("${advisor.ai-gateway.base-url:http://127.0.0.1:8090}") String aiGatewayBaseUrl,
      @Value("${advisor.ai-gateway.api-key:dev-key}") String aiGatewayApiKey,
      @Value("${advisor.ai-gateway.model:gpt-4.1-mini}") String aiGatewayModel,
      @Value("${advisor.agent.timeout-ms:600000}") long timeoutMs,
      @Value("${advisor.agent.first-chunk-timeout-ms:120000}") long firstChunkTimeoutMs,
      @Value("${advisor.agent.debug-stream:${DEBUG_STREAM:false}}") boolean debugStream) {
    SseEventParser parser = new SseEventParser(objectMapper);
    this.streamEventCollector = new AgentStreamEventCollector(parser, debugStream);
    this.payloadBuilder = new AgentPayloadBuilder(objectMapper);
    this.agentBaseUrl = agentBaseUrl;
    this.agentApiToken = agentApiToken;
    this.aiGatewayEnabled = aiGatewayEnabled;
    this.aiGatewayBaseUrl = aiGatewayBaseUrl;
    this.aiGatewayApiKey = aiGatewayApiKey;
    this.aiGatewayModel = aiGatewayModel;
    this.debugStream = debugStream;
    this.requestTimeoutMs = Math.max(timeoutMs, 1000L);
    this.firstChunkTimeoutMs = Math.max(firstChunkTimeoutMs, 1000L);
    this.httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofMillis(this.requestTimeoutMs))
            .build();
  }

  @Override
  public ChatStreamProxyResult proxyChatStream(
      ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException {
    return proxyInternal(request, userId, outputStream);
  }

  @Override
  public ChatStreamProxyResult proxyChatOnce(ChatStreamRequestDTO request, Long userId)
      throws IOException {
    return proxyInternal(request, userId, null);
  }

  private ChatStreamProxyResult proxyInternal(
      ChatStreamRequestDTO request, Long userId, OutputStream outputStream) throws IOException {
    long startAt = System.currentTimeMillis();
    String payload =
        aiGatewayEnabled
            ? payloadBuilder.buildAiGatewayPayload(request, aiGatewayModel)
            : payloadBuilder.buildAgentPayload(request, userId);
    byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);

    log.info(
        "agent_proxy start, traceId={}, sessionId={}, turnId={}, userId={}, payloadBytes={}, streamMode={}",
        LogTraceUtil.get(LogTraceUtil.TRACE_ID),
        request.getSessionId(),
        LogTraceUtil.get(LogTraceUtil.TURN_ID),
        userId,
        payloadBytes.length,
        outputStream != null);

    if (debugStream) {
      log.info(
          "debug_stream java request: sessionId={}, userId={}, payload_length={}, payload_preview={}",
          request.getSessionId(),
          userId,
          payloadBytes.length,
          transportSupport.preview(payload, DEBUG_PREVIEW_LIMIT));
    }
    String traceId = LogTraceUtil.get(LogTraceUtil.TRACE_ID);
    String turnId = LogTraceUtil.get(LogTraceUtil.TURN_ID);
    HttpRequest httpRequest =
        transportSupport.buildRequest(
            payload,
            aiGatewayEnabled,
            aiGatewayBaseUrl,
            agentBaseUrl,
            aiGatewayApiKey,
            agentApiToken,
            requestTimeoutMs,
            traceId,
            turnId);

    HttpResponse<InputStream> response;
    try {
      response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Agent stream interrupted", e);
    }

    if (response.statusCode() >= 400) {
      String errorBody = transportSupport.readErrorBody(response);
      log.warn(
          "agent_proxy failed, status={}, payloadBytes={}, bodyPreview={}, elapsedMs={}",
          response.statusCode(),
          payloadBytes.length,
          transportSupport.preview(errorBody, DEBUG_PREVIEW_LIMIT),
          transportSupport.elapsedSince(startAt));
      throw new BadRequestException("agent stream failed: http " + response.statusCode());
    }

    StringBuilder sseBuffer = new StringBuilder();
    StringBuilder deltaPreview = new StringBuilder();
    StringBuilder assistantText = new StringBuilder();
    int deltaCount = 0;
    boolean firstDeltaLogged = false;
    AtomicBoolean firstChunkReceived = new AtomicBoolean(false);
    AtomicBoolean firstChunkTimedOut = new AtomicBoolean(false);
    AtomicBoolean sawDoneEvent = new AtomicBoolean(false);
    AtomicBoolean sawErrorEvent = new AtomicBoolean(false);
    List<ChatMessageDO.SourceReference> sources = new ArrayList<>();
    List<ChatMessageDO.StreamEventRecord> events = new ArrayList<>();

    if (debugStream) {
      log.info("debug_stream java start: sessionId={}, userId={}", request.getSessionId(), userId);
    }

    try (InputStream bodyStream = response.body()) {
      ScheduledFuture<?> firstChunkTimeoutFuture =
          FIRST_CHUNK_WATCHDOG.schedule(
              () -> {
                if (!firstChunkReceived.get()) {
                  firstChunkTimedOut.set(true);
                  try {
                    bodyStream.close();
                  } catch (IOException ignored) {
                    // no-op
                  }
                }
              },
              firstChunkTimeoutMs,
              TimeUnit.MILLISECONDS);
      byte[] buffer = new byte[8192];
      int read;
      try {
        while ((read = bodyStream.read(buffer)) != -1) {
          if (firstChunkReceived.compareAndSet(false, true)) {
            firstChunkTimeoutFuture.cancel(false);
            log.info(
                "agent_proxy first_byte, elapsedMs={}", transportSupport.elapsedSince(startAt));
          }
          String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
          sseBuffer.append(chunk);

          int before = deltaCount;
          deltaCount +=
              streamEventCollector.collect(
                  sseBuffer,
                  deltaPreview,
                  assistantText,
                  sources,
                  events,
                  sawDoneEvent,
                  sawErrorEvent);
          if (!firstDeltaLogged && deltaCount > before) {
            firstDeltaLogged = true;
            log.info(
                "agent_proxy first_chunk, elapsedMs={}", transportSupport.elapsedSince(startAt));
          }

          if (outputStream != null) {
            try {
              outputStream.write(buffer, 0, read);
              outputStream.flush();
            } catch (IOException io) {
              if (transportSupport.isClientAbort(io)) {
                log.warn(
                    "agent_proxy client_disconnected, reason={}",
                    LogTraceUtil.preview(io.getMessage()));
                return new ChatStreamProxyResult(
                    assistantText.toString(), List.copyOf(sources), List.copyOf(events));
              }
              throw io;
            }
          }
        }
      } catch (IOException io) {
        if (firstChunkTimedOut.get()) {
          throw new IOException(
              "agent first chunk timeout after " + firstChunkTimeoutMs + "ms", io);
        }
        throw io;
      } finally {
        firstChunkTimeoutFuture.cancel(false);
      }
    } finally {
      if (debugStream) {
        log.info(
            "debug_stream java done: deltas={}, sawDone={}, sawError={}, answer_preview={}",
            deltaCount,
            sawDoneEvent.get(),
            sawErrorEvent.get(),
            deltaPreview);
      }
    }

    String finishReason =
        sawDoneEvent.get() ? "sys_done" : (sawErrorEvent.get() ? "sys_error" : "stream_closed");
    if (deltaCount == 0) {
      log.warn(
          "agent_proxy invalid_stream_no_delta, finishReason={}, sawDone={}, sawError={}, elapsedMs={}",
          finishReason,
          sawDoneEvent.get(),
          sawErrorEvent.get(),
          transportSupport.elapsedSince(startAt));
      throw new BadRequestException("agent stream failed: no delta");
    }
    log.info(
        "agent_proxy done, deltas={}, answerLen={}, finishReason={}, sawDone={}, sawError={}, elapsedMs={}",
        deltaCount,
        assistantText.length(),
        finishReason,
        sawDoneEvent.get(),
        sawErrorEvent.get(),
        transportSupport.elapsedSince(startAt));

    return new ChatStreamProxyResult(assistantText.toString(), sources, events);
  }
}
