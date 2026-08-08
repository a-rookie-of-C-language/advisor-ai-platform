package cn.edu.cqut.advisorplatform.service.impl.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import cn.edu.cqut.advisorplatform.common.exception.BadRequestException;
import cn.edu.cqut.advisorplatform.service.model.ChatStreamProxyResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class AgentStreamResponseReaderTest {

  private final AgentStreamResponseReader reader =
      new AgentStreamResponseReader(
          new AgentStreamEventCollector(new SseEventParser(new ObjectMapper()), false),
          new AgentProxyTransportSupport(),
          false,
          1000L);

  @Test
  void read_shouldCollectAssistantTextAndForwardRawStream() throws Exception {
    String sse =
        "event:llm_data\n"
            + "data:{\"payload\":{\"text\":\"hello\"}}\n\n"
            + "event:llm_data\n"
            + "data:{\"payload\":{\"text\":\" world\"}}\n\n"
            + "event:sys_done\n"
            + "data:{}\n\n";
    ByteArrayOutputStream output = new ByteArrayOutputStream();

    ChatStreamProxyResult result =
        reader.read(streamOf(sse), output, 1001L, 1L, System.currentTimeMillis());

    assertThat(result.getAssistantText()).isEqualTo("hello world");
    assertThat(output.toString(StandardCharsets.UTF_8)).isEqualTo(sse);
  }

  @Test
  void read_shouldRejectStreamWithoutDelta() {
    String sse = "event:sys_done\n" + "data:{}\n\n";

    assertThatThrownBy(
            () -> reader.read(streamOf(sse), null, 1001L, 1L, System.currentTimeMillis()))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("no delta");
  }

  private ByteArrayInputStream streamOf(String value) {
    return new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8));
  }
}
