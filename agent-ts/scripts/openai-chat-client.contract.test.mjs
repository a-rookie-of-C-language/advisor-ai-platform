import assert from "node:assert/strict";
import test from "node:test";
import { OpenAIChatClient } from "../dist/openai/chat/core/client/OpenAIChatClient.js";

test("openai chat client structured output falls back to json mode on schema failure", async () => {
  let schemaCalls = 0;
  let jsonCalls = 0;
  const client = new OpenAIChatClient({
    openAiApiKey: "key",
    openAiBaseUrl: "https://example.com",
    openAiModel: "gpt-test",
    openAiTemperature: 0,
    requestTimeoutMs: 1000
  });
  client.streamChat = async function* (_messages, _signal, responseFormat) {
    if (responseFormat?.type === "json_schema") {
      schemaCalls += 1;
      throw new Error("json_schema unsupported");
    }
    if (responseFormat?.type === "json_object") {
      jsonCalls += 1;
      yield "{\"ok\":true}";
      return;
    }
    yield "{\"ok\":false}";
  };

  const result = await client.chatWithStructuredOutput([], { name: "demo", strict: false, schema: { type: "object" } });
  assert.equal(schemaCalls, 1);
  assert.equal(jsonCalls, 1);
  assert.equal(result, "{\"ok\":true}");
});

test("openai chat client respects structured output mode disablement", async () => {
  let schemaCalls = 0;
  let jsonCalls = 0;
  const client = new OpenAIChatClient({
    openAiApiKey: "key",
    openAiBaseUrl: "https://example.com",
    openAiModel: "gpt-test",
    openAiTemperature: 0,
    openAiStructuredOutputMode: "disabled",
    requestTimeoutMs: 1000
  });
  client.streamChat = async function* (_messages, _signal, responseFormat) {
    if (responseFormat?.type === "json_schema") {
      schemaCalls += 1;
      yield "{\"ok\":false}";
      return;
    }
    if (responseFormat?.type === "json_object") {
      jsonCalls += 1;
      yield "{\"ok\":true}";
      return;
    }
    yield "{\"ok\":false}";
  };

  const result = await client.chatWithStructuredOutput([], { name: "demo", strict: false, schema: { type: "object" } });
  assert.equal(schemaCalls, 0);
  assert.equal(jsonCalls, 1);
  assert.equal(result, "{\"ok\":true}");
});
