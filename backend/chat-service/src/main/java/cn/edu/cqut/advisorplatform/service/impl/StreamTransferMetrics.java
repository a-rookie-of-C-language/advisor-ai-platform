package cn.edu.cqut.advisorplatform.service.impl;

import java.util.concurrent.atomic.AtomicLong;
import lombok.Getter;

/**
 * 流式传输指标统计
 *
 * <p>用于监控流式响应的传输状态，包括： - 传输字节数 - 写入次数 - 客户端断开次数 - 写入超时次数
 */
@Getter
class StreamTransferMetrics {

  private final AtomicLong totalBytesWritten = new AtomicLong(0);
  private final AtomicLong writeCount = new AtomicLong(0);
  private final AtomicLong clientDisconnectCount = new AtomicLong(0);
  private final AtomicLong writeTimeoutCount = new AtomicLong(0);
  private final AtomicLong writeErrorCount = new AtomicLong(0);

  void recordWrite(int bytes) {
    totalBytesWritten.addAndGet(bytes);
    writeCount.incrementAndGet();
  }

  void recordClientDisconnect() {
    clientDisconnectCount.incrementAndGet();
  }

  void recordWriteTimeout() {
    writeTimeoutCount.incrementAndGet();
  }

  void recordWriteError() {
    writeErrorCount.incrementAndGet();
  }

  String summary() {
    return String.format(
        "bytes=%d, writes=%d, disconnects=%d, timeouts=%d, errors=%d",
        totalBytesWritten.get(),
        writeCount.get(),
        clientDisconnectCount.get(),
        writeTimeoutCount.get(),
        writeErrorCount.get());
  }
}
