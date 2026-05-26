package cn.edu.cqut.advisorplatform.service.impl;

import cn.edu.cqut.advisorplatform.entity.SourceReference;
import cn.edu.cqut.advisorplatform.entity.StreamEventRecord;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import cn.edu.cqut.advisorplatform.utils.LogTraceUtil;
import java.io.IOException;
import java.io.OutputStream;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
class AgentStreamClientWriter {

  private final AgentProxyTransportSupport transportSupport;

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
}
