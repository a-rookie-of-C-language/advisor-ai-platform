import assert from "node:assert/strict";
import test from "node:test";
import { ConversationQueryEngine } from "../dist/query_engine/ConversationQueryEngine.js";
import { EngineEvent } from "../dist/query_engine/EngineEvent.js";
import { parseSseToEngineEvent } from "../dist/query_engine/parse_sse_to_engine_event.js";

test("conversation query engine fills missing trace id and appends sys_done", async () => {
  const engine = new ConversationQueryEngine({
    async *run() {
      yield new EngineEvent("llm_data", "llm", { text: "hello" });
    }
  });

  const events = [];
  for await (const event of engine.queryEvents({ messages: [], traceId: "trace-1" })) {
    events.push(event);
  }

  assert.equal(events.length, 2);
  assert.equal(events[0].traceId, "trace-1");
  assert.equal(events[0].event, "llm_data");
  assert.equal(events[1].event, "sys_done");
  assert.equal(events[1].traceId, "trace-1");
});

test("query engine parses sse payload aliases and preserves event version", () => {
  const event = parseSseToEngineEvent(
    "event: tool_result\ndata: {\"traceId\":\"trace-2\",\"eventVersion\":\"2.0\",\"source\":\"tool\",\"payload\":{\"ok\":true}}\n\n"
  );
  assert.equal(event.event, "tool_result");
  assert.equal(event.traceId, "trace-2");
  assert.equal(event.eventVersion, "2.0");
  assert.deepEqual(event.payload, { ok: true });
});
