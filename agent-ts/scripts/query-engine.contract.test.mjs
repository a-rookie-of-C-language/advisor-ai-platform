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

test("conversation query engine emits empty stream error when strategy yields nothing", async () => {
  const engine = new ConversationQueryEngine({
    async *run() {}
  });

  const events = [];
  for await (const event of engine.queryEvents({ messages: [], traceId: "trace-2" })) {
    events.push(event);
  }

  assert.equal(events.length, 1);
  assert.equal(events[0].event, "error");
  assert.equal(events[0].traceId, "trace-2");
  assert.deepEqual(events[0].payload, { message: "stream finished without content" });
});

test("conversation query engine emits progress while waiting for the first event", async () => {
  const engine = new ConversationQueryEngine(
    {
      async *run() {
        await new Promise((resolve) => setTimeout(resolve, 120));
        yield new EngineEvent("llm_data", "llm", { text: "hello" });
      }
    },
    20
  );

  const events = [];
  for await (const event of engine.queryEvents({ messages: [], traceId: "trace-3" })) {
    events.push(event);
  }

  assert.ok(events.some((event) => event.event === "sys_progress"));
  assert.equal(events.at(-1)?.event, "sys_done");
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
