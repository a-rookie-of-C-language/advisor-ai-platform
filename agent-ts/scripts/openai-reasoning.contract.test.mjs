import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { OpenAIChatResponseBodyCollector } from "../dist/openai/chat/completion/reader/OpenAIChatResponseBodyCollector.js";
import { OpenAIChatClient } from "../dist/openai/chat/core/client/OpenAIChatClient.js";

test("openai stream collector preserves reasoning deltas", async () => {
  const collector = new OpenAIChatResponseBodyCollector();
  const body = readableFromLines([
    'data: {"choices":[{"delta":{"reasoning_content":"think-1","content":"hello"}}]}',
    "",
    'data: {"choices":[{"delta":{"reasoning_content":"think-2"}}]}',
    "",
    "data: [DONE]",
    ""
  ]);

  const result = await collector.collect(body);
  assert.deepEqual(result.reasoningParts, ["think-1", "think-2"]);
  assert.deepEqual(result.textParts, ["hello"]);
});

test("openai client emits reasoning delta events", async () => {
  const server = createSseServer([
    'data: {"choices":[{"delta":{"reasoning_content":"think-1","content":"hello"}}]}',
    "",
    "data: [DONE]",
    ""
  ]);
  await server.listen();

  try {
    const client = new OpenAIChatClient({
      openAiApiKey: "k",
      openAiBaseUrl: "http://127.0.0.1:" + server.port,
      openAiModel: "m",
      requestTimeoutMs: 1_000
    });
    const events = [];
    for await (const event of client.streamChatEvents([{ role: "user", content: "hi" }])) {
      events.push(event);
    }
    assert.equal(events.some((event) => event.type === "reasoning_delta"), true);
    assert.equal(events.some((event) => event.type === "delta"), true);
  } finally {
    await server.close();
  }
});

function readableFromLines(lines) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    }
  });
}

function createSseServer(lines) {
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.end(lines.map((line) => `${line}\n`).join(""));
  });
  return {
    port: 0,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (typeof address === "string" || !address) throw new Error("invalid server address");
      this.port = address.port;
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
