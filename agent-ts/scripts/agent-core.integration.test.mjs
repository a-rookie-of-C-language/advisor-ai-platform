import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import path from "node:path";
import { test } from "node:test";
import { AgentCoreClient } from "../dist/core/client/AgentCoreClient.js";
import { AgentChatStreamSession } from "../dist/app/session/core/stream/AgentChatStreamSession.js";
import { OpenAIChatClient } from "../dist/openai/chat/core/client/OpenAIChatClient.js";

const executableName = process.platform === "win32" ? "agent-core.exe" : "agent-core";
const executablePath = path.resolve("..", "agent-core", "target", "debug", executableName);

test("AgentCoreClient streams Rust events from an OpenAI-compatible SSE response", async () => {
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.end(
      'data: {"choices":[{"delta":{"content":"integration"}}]}\n\n' +
        'data: {"choices":[{"finish_reason":"stop"}]}\n\n' +
        "data: [DONE]\n\n"
    );
  });
  await listen(server);

  try {
    const address = server.address();
    assert.notEqual(typeof address, "string");
    assert.ok(address);

    const events = [];
    const client = new AgentCoreClient(executablePath);
    for await (const event of client.streamChat({
      url: `http://127.0.0.1:${address.port}/chat/completions`,
      apiKey: "integration-key",
      model: "integration-model",
      temperature: 0.2,
      requestTimeoutMs: 1_000,
      messages: []
    })) {
      events.push(event);
    }

    assert.deepEqual(events, [
      { type: "delta", text: "integration" },
      { type: "done", finish_reason: "stop" }
    ]);
  } finally {
    server.close();
  }
});

test("AgentChatStreamSession executes Rust tool calls and sends a second round", async () => {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      requests.push(JSON.parse(body));
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      if (body.includes('"role":"tool"')) {
        response.end(
          'data: {"choices":[{"delta":{"content":"tool-result-used"}}]}\n\n' +
            'data: {"choices":[{"finish_reason":"stop"}]}\n\n' +
            "data: [DONE]\n\n"
        );
        return;
      }
      response.end(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_","function":{"name":"search","arguments":"{\\"q\\":\\"hel"}}]}}]}\n\n' +
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"1","function":{"arguments":"lo\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n' +
          "data: [DONE]\n\n"
      );
    });
  });
  await listen(server);

  try {
    const address = server.address();
    assert.notEqual(typeof address, "string");
    assert.ok(address);
    const writes = [];
    const config = {
      openAiApiKey: "integration-key",
      openAiBaseUrl: "http://127.0.0.1:" + address.port,
      openAiModel: "integration-model",
      openAiTemperature: 0.2,
      requestTimeoutMs: 1_000
    };
    const tool = {
      type: "function",
      function: { name: "search", description: "search", parameters: { type: "object" } }
    };
    const session = new AgentChatStreamSession(
      config.openAiApiKey,
      config,
      new AgentCoreClient(executablePath),
      { async build() { return [{ role: "user", content: "hello" }]; } },
      { async submit() {} },
      { async *streamChatEvents() { throw new Error("TS OpenAI path should not be called"); } },
      { async listTools() { return [tool]; } },
      { create() { return async () => ({ output: "search-result", success: true }); } }
    );
    const writer = {
      async start() {},
      async write(event, source, payload) { writes.push({ event, source, payload }); },
      async done(reason) { writes.push({ event: "done", reason }); },
      async error(code, message, retryable) { throw new Error(code + ": " + message + ": " + retryable); }
    };

    await session.stream({ messages: [{ role: "user", content: "hello" }] }, "turn-1", writer);

    assert.equal(requests.length, 2);
    assert.deepEqual(writes.map(({ event }) => event), ["tool_call", "tool_result", "llm_delta", "done"]);
    assert.equal(writes[2].payload.text, "tool-result-used");
  } finally {
    server.close();
  }
});

test("AgentCoreClient aborts a running Rust stream", async () => {
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(200, { "Content-Type": "text/event-stream" });
  });
  await listen(server);

  try {
    const address = server.address();
    assert.notEqual(typeof address, "string");
    assert.ok(address);
    const controller = new AbortController();
    const client = new AgentCoreClient(executablePath);
    const stream = client.streamChat({
      url: "http://127.0.0.1:" + address.port + "/chat/completions",
      apiKey: "integration-key",
      model: "integration-model",
      temperature: 0.2,
      requestTimeoutMs: 10_000,
      messages: []
    }, controller.signal);

    const consuming = (async () => {
      for await (const _event of stream) {
        // The mock deliberately does not emit events.
      }
    })();
    setTimeout(() => controller.abort(), 50);
    await assert.rejects(consuming, /aborted|exited/);
  } finally {
    server.close();
  }
});

test("AgentChatStreamSession aborts a running TS fallback stream", async () => {
  let requestAborted = false;
  const controller = new AbortController();
  let resolveResponseClosed;
  const responseClosed = new Promise(resolve => {
    resolveResponseClosed = resolve;
  });
  const server = createServer((request, response) => {
    request.resume();
    request.on("aborted", () => {
      requestAborted = true;
    });
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.on("close", () => {
      requestAborted = true;
      resolveResponseClosed();
    });
    setTimeout(() => controller.abort(), 50);
  });
  await listen(server);

  try {
    const address = server.address();
    assert.notEqual(typeof address, "string");
    assert.ok(address);
    const config = {
      openAiApiKey: "integration-key",
      openAiBaseUrl: "http://127.0.0.1:" + address.port,
      openAiModel: "integration-model",
      openAiTemperature: 0.2,
      requestTimeoutMs: 10_000
    };
    const writes = [];
    const session = new AgentChatStreamSession(
      config.openAiApiKey,
      config,
      { canStream() { return false; } },
      { async build() { return [{ role: "user", content: "hello" }]; } },
      { async submit() {} },
      new OpenAIChatClient(config),
      { async listTools() { return []; } },
      { create() { return async () => ({ output: "unused", success: true }); } }
    );
    const writer = {
      signal: controller.signal,
      async start() {},
      async write(event, source, payload) { writes.push({ event, source, payload }); },
      async done(reason) { writes.push({ event: "done", reason }); },
      async error(code, message, retryable) { throw new Error(code + ": " + message + ": " + retryable); }
    };

    await session.stream({ messages: [{ role: "user", content: "hello" }] }, "turn-1", writer);
    await responseClosed;

    assert.equal(requestAborted, true);
    assert.deepEqual(writes, []);
  } finally {
    server.close();
  }
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}
