package cn.edu.cqut.advisorplatform.service.impl.agent;

import cn.edu.cqut.advisorplatform.entity.chat.SourceReference;
import cn.edu.cqut.advisorplatform.entity.chat.StreamEventRecord;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.io.IOException;
import java.io.OutputStream;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 流式响应客户端写入器
 *
 * <p>支持背压控制和客户端断开检测： - 使用阻塞式写入，当输出缓冲区满时自动阻塞等待 - 检测客户端断开连接（Broken Pipe、Connection Reset 等） -
 * 记录传输指标用于监控
 */
@Slf4j
@RequiredArgsConstructor
class AgentStreamClientWriter {

  private final AgentProxyTransportSupport transportSupport;
  private final StreamTransferMetrics metrics = new StreamTransferMetrics();

  ChatStreamProxyResult write(
      OutputStream outputStream,
      byte[] buffer,
      int read,
      StringBuilder assistantText,
      List<SourceReference> sources,
      List<StreamEventRecord> events)
      throws IOException {
    if (outputStream == null) {
      return null;
    }
    try {
      // 阻塞式写入：当 OutputStream 缓冲区满时会自动阻塞
      // 这提供了自然的背压控制，防止发送方速度超过接收方消费速度
      outputStream.write(buffer, 0, read);
      outputStream.flush();
      metrics.recordWrite(read);
    } catch (SocketException e) {
      // Socket 异常通常是客户端主动断开连接
      metrics.recordClientDisconnect();
      log.warn(
          "agent_proxy client_disconnected, reason={}, metrics={}",
          LogTraceUtil.preview(e.getMessage()),
          metrics.summary());
      return new ChatStreamProxyResult(
          assistantText.toString(), List.copyOf(sources), List.copyOf(events));
    } catch (SocketTimeoutException e) {
      // 写入超时，可能是客户端消费过慢
      metrics.recordWriteTimeout();
      log.warn(
          "agent_proxy write_timeout, reason={}, metrics={}",
          LogTraceUtil.preview(e.getMessage()),
          metrics.summary());
      // 超时不一定是致命错误，继续尝试
      throw e;
    } catch (IOException io) {
      if (transportSupport.isClientAbort(io)) {
        metrics.recordClientDisconnect();
        log.warn(
            "agent_proxy client_disconnected, reason={}, metrics={}",
            LogTraceUtil.preview(io.getMessage()),
            metrics.summary());
        return new ChatStreamProxyResult(
            assistantText.toString(), List.copyOf(sources), List.copyOf(events));
      }
      metrics.recordWriteError();
      log.error(
          "agent_proxy write_error, reason={}, metrics={}",
          LogTraceUtil.preview(io.getMessage()),
          metrics.summary());
      throw io;
    }
    return null;
  }

  StreamTransferMetrics getMetrics() {
    return metrics;
  }
}
