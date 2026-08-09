import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import path from "node:path";
import { test } from "node:test";
import { AgentCoreClient } from "../dist/core/client/AgentCoreClient.js";

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

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}
