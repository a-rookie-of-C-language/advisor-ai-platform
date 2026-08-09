package cn.edu.cqut.advisorplatform.service.impl.agent;

import static org.assertj.core.api.Assertions.assertThat;

import cn.edu.cqut.advisorplatform.entity.chat.SourceReference;
import cn.edu.cqut.advisorplatform.entity.chat.StreamEventRecord;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class AgentStreamEventCollectorTest {

  private final AgentStreamEventCollector collector =
      new AgentStreamEventCollector(new SseEventParser(new ObjectMapper()), false);

  @Test
  void collect_shouldPersistConfiguredStreamEvents() {
    StringBuilder buffer =
        new StringBuilder(
            """
            event: tool_result
            data: {"source":"tool","trace_id":"t1","timestamp":123,"payload":{"status":"hit"}}

            """);
    List<StreamEventRecord> events = new ArrayList<>();

    collector.collect(
        buffer,
        new StringBuilder(),
        new StringBuilder(),
        new ArrayList<SourceReference>(),
        events,
        new AtomicBoolean(),
        new AtomicBoolean());

    assertThat(events).hasSize(1);
    assertThat(events.get(0).getEvent()).isEqualTo("tool_result");
    assertThat(events.get(0).getPayload()).containsEntry("status", "hit");
  }

  @Test
  void collect_shouldSkipNonPersistentStreamEvents() {
    StringBuilder buffer =
        new StringBuilder(
            """
            event: llm_data
            data: {"payload":{"text":"hello"}}

            """);
    List<StreamEventRecord> events = new ArrayList<>();

    int deltaCount =
        collector.collect(
            buffer,
            new StringBuilder(),
            new StringBuilder(),
            new ArrayList<SourceReference>(),
            events,
            new AtomicBoolean(),
            new AtomicBoolean());

    assertThat(deltaCount).isEqualTo(1);
    assertThat(events).isEmpty();
  }
}
