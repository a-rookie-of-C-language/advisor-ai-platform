import assert from "node:assert/strict";
import test from "node:test";
import { AgentLoop } from "../dist/app/loop/core/AgentLoop.js";
import { RegexSafetyFilter } from "../dist/safety/regex/RegexSafetyFilter.js";
import { StreamingRegexSafetyFilter } from "../dist/safety/streaming/StreamingRegexSafetyFilter.js";

const request = { messages: [{ role: "user", content: "run tools" }] };

async function* streamWithToolCalls() {
  yield { type: "tool_call", toolCallId: "call-1", toolName: "slow_a", toolArgs: {} };
  yield { type: "tool_call", toolCallId: "call-2", toolName: "slow_b", toolArgs: {} };
}

async function* streamWithoutTools() {
  yield { type: "delta", text: "done" };
}

test("tool results are executed concurrently and written back in call order", async () => {
  let started = 0;
  let release;
  const bothStarted = new Promise((resolve) => { release = resolve; });
  const executionOrder = [];
  const writeOrder = [];
  const loop = new AgentLoop({
    chatRequest: request,
    maxTurns: 1,
    stream: streamWithToolCalls,
    executeTool: async (_request, toolName) => {
      started += 1;
      if (started === 2) release();
      await bothStarted;
      executionOrder.push(toolName);
      return { output: toolName, success: true };
    },
    writer: async (event) => {
      if (event.type === "tool_result") writeOrder.push(event.toolName);
    }
  });

  await loop.run();
  assert.deepEqual(executionOrder.sort(), ["slow_a", "slow_b"]);
  assert.deepEqual(writeOrder, ["slow_a", "slow_b"]);
});

test("declared tool timeout returns structured TOOL_TIMEOUT", async () => {
  const loop = new AgentLoop({
    chatRequest: request,
    maxTurns: 1,
    stream: streamWithToolCalls,
    toolTimeoutMs: () => 5,
    executeTool: async () => new Promise((resolve) => {
      setTimeout(() => resolve({ output: "late", success: true }), 30);
    }),
    writer: async (event) => {
      if (event.type === "tool_result") results.push(JSON.parse(event.toolOutput));
    },
  });

  const results = [];
  await loop.run();
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.code === "TOOL_TIMEOUT"));
});

test("safety filters redact PII and secrets across stream chunk boundaries", () => {
  const filter = new RegexSafetyFilter();
  assert.equal(filter.redact("联系 13812345678 或 test@example.com"), "联系 [MASK:PHONE] 或 [MASK:EMAIL]");
  assert.equal(filter.redact("token=sk-test12345678901234567890"), "[MASK:SECRET]");

  const streaming = new StreamingRegexSafetyFilter(filter);
  const output = streaming.processChunk("token=sk-") + streaming.processChunk("test12345678901234567890") + streaming.flush();
  assert.equal(output, "[MASK:SECRET]");
});
