import assert from "node:assert/strict";
import test from "node:test";
import { AgentChatStreamSession } from "../dist/app/session/core/stream/AgentChatStreamSession.js";

test("legacy stream emits tool explorer reasoning when exploration matches", async () => {
  const events = [];
  const session = new AgentChatStreamSession(
    "",
    {
      contextWindowTokens: 1024,
      contextReserveTokens: 128,
      contextKeepLastMessages: 2,
      failureMemoryPath: ".agent-data/failure-memory.jsonl",
      failureMemoryScoreThreshold: 7
    },
    {
      streamChat: async function* () {},
      canStream: () => false
    },
    {
      build: async () => [],
      transform: async (messages) => messages
    },
    {
      submit: async () => {}
    },
    {
      streamChat: async function* () {
        yield "answer";
      },
      streamChatEvents: async function* () {},
      listTools: async () => [],
      executeTool: async () => ({ output: "", success: true })
    },
    {
      listTools: async () => [
        { type: "function", function: { name: "rag_search", description: "rag_search", parameters: {} } }
      ],
      executeTool: async () => ({ output: "", success: true })
    }
  );

  const writer = {
    start: async () => {},
    done: async () => {},
    error: async () => {},
    signal: undefined,
    write: async (event, source, payload) => {
      events.push({ event, source, payload });
    }
  };

  await session.stream({ messages: [{ role: "user", content: "请根据知识库文档解释" }] }, "turn-1", writer);
  assert.equal(events.some((event) => event.event === "sys_reasoning"), true);
});

test("legacy stream emits sys_progress before first content when initial work is slow", async () => {
  const events = [];
  const session = new AgentChatStreamSession(
    "",
    {
      contextWindowTokens: 1024,
      contextReserveTokens: 128,
      contextKeepLastMessages: 2,
      failureMemoryPath: ".agent-data/failure-memory.jsonl",
      failureMemoryScoreThreshold: 7
    },
    {
      canStream: () => false
    },
    {
      build: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return [{ role: "user", content: "hello" }];
      },
      transform: async (messages) => messages
    },
    {
      submit: async () => {}
    },
    {
      streamChat: async function* () {
        yield "answer";
      },
      streamChatEvents: async function* () {
        yield { type: "delta", text: "answer" };
      },
      listTools: async () => [],
      executeTool: async () => ({ output: "", success: true })
    },
    {
      listTools: async () => [],
      executeTool: async () => ({ output: "", success: true })
    }
  );

  const writer = {
    start: async () => {},
    done: async () => {},
    error: async () => {},
    signal: undefined,
    write: async (event, source, payload) => {
      events.push({ event, source, payload });
    }
  };

  await session.stream({ messages: [{ role: "user", content: "hello" }] }, "turn-1", writer);
  const progressIndex = events.findIndex((event) => event.event === "sys_progress");
  const firstContentIndex = events.findIndex((event) => event.event === "sys_intent_route" || event.event === "llm_data");
  assert.notEqual(progressIndex, -1);
  assert.notEqual(firstContentIndex, -1);
  assert.ok(progressIndex < firstContentIndex);
});
