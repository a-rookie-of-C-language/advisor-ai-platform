import assert from "node:assert/strict";
import test from "node:test";
import { AgentChatStreamSession } from "../dist/app/session/core/stream/AgentChatStreamSession.js";

test("force fetch branch ends after fetch context and one model round", async () => {
  const events = [];
  const session = new AgentChatStreamSession(
    "key",
    {
      contextWindowTokens: 2048,
      contextReserveTokens: 256,
      contextKeepLastMessages: 6,
      failureMemoryPath: "",
      failureMemoryScoreThreshold: 7
    },
    {
      canStream: () => false,
      serializeEvent: async ({ event, source, traceId, payload }) =>
        `event: ${event}\ndata: ${JSON.stringify({ source, trace_id: traceId, payload })}\n\n`,
      health: async () => ({})
    },
    {
      build: async (request) => request.messages,
      transform: async (messages) => messages
    },
    {
      submit: async () => {}
    },
    {
      streamChat: async function* () {
        yield "forced answer";
      },
      streamChatEvents: async function* () {
        yield { type: "delta", text: "forced answer" };
      }
    },
    {
      listTools: async () => [
        {
          type: "function",
          function: {
            name: "web_fetch",
            description: "fetch",
            parameters: {}
          },
          meta: { readOnly: true, searchHint: "http" }
        }
      ],
      executeTool: async (_request, toolName) => ({
        output: JSON.stringify({ ok: true, status: "hit", items: [{ content: "网页内容" }] }),
        success: true,
        toolName
      })
    }
  );

  const writer = {
    signal: new AbortController().signal,
    start: async () => events.push("sys_start"),
    write: async (event, _source, payload) => events.push({ event, payload }),
    done: async (finishReason) => events.push({ event: "sys_done", payload: { finishReason } }),
    error: async () => {}
  };

  await session.stream(
    {
      messages: [{ role: "user", content: "https://example.com" }],
      traceId: "trace-1"
    },
    "turn-1",
    writer
  );

  assert.equal(events.filter((item) => typeof item === "object" && item.event === "sys_done").length, 1);
  assert.ok(events.some((item) => typeof item === "object" && item.event === "tool_use"));
  assert.ok(events.some((item) => typeof item === "object" && item.event === "llm_data"));
});
