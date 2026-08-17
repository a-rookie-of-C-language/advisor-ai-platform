import assert from "node:assert/strict";
import test from "node:test";
import { AgentLoop } from "../dist/app/loop/core/AgentLoop.js";
import { ReplayProvider } from "../dist/testing/replay/ReplayProvider.js";
import { SessionEventRecorder } from "../dist/testing/replay/SessionEventRecorder.js";

test("replay provider drives the real AgentLoop and reproduces the session event contract", async () => {
  const request = { messages: [{ role: "user", content: "查找课程安排" }] };
  const provider = new ReplayProvider([
    {
      expectedMessages: request.messages,
      events: [
        { type: "tool_call", toolCallId: "call-search", toolName: "search", toolArgs: { query: "课程安排" } }
      ]
    },
    {
      expectedMessages: [
        ...request.messages,
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call-search",
              type: "function",
              function: { name: "search", arguments: '{"query":"课程安排"}' }
            }
          ]
        },
        { role: "tool", tool_call_id: "call-search", content: "周一 14:00" }
      ],
      events: [{ type: "delta", text: "课程安排是周一 14:00。" }]
    }
  ]);
  const recorder = new SessionEventRecorder();
  const streamEvents = [];
  const loop = new AgentLoop({
    chatRequest: request,
    maxTurns: 2,
    stream: provider.stream,
    executeTool: async (_request, toolName, args) => {
      assert.equal(toolName, "search");
      assert.deepEqual(args, { query: "课程安排" });
      return { output: "周一 14:00", success: true };
    },
    writer: async (event) => {
      streamEvents.push(event);
      recorder.recordStream(event);
    },
    onEvent: async (event) => recorder.recordLifecycle(event)
  });

  const result = await loop.run();
  provider.assertConsumed();

  assert.equal(result.answer, "课程安排是周一 14:00。");
  assert.deepEqual(streamEvents.map((event) => event.type), ["tool_call", "tool_result", "delta"]);
  assert.deepEqual(
    recorder.snapshot().filter((entry) => entry.kind === "lifecycle").map((entry) => entry.event.type),
    [
      "agent_start",
      "turn_start",
      "provider_request_start",
      "provider_request_end",
      "tool_execution_start",
      "tool_execution_end",
      "turn_end",
      "turn_start",
      "provider_request_start",
      "provider_request_end",
      "turn_end",
      "agent_end"
    ]
  );
});

test("replay provider rejects a request that cannot be reconstructed from the fixture", async () => {
  const provider = new ReplayProvider([
    { expectedMessages: [{ role: "user", content: "expected" }], events: [] }
  ]);
  const stream = provider.stream([{ role: "user", content: "actual" }]);
  await assert.rejects(async () => {
    for await (const _event of stream) {
      // The request mismatch is raised before the first event.
    }
  }, /Replay request mismatch/);
});
