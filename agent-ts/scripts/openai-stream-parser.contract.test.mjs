import assert from "node:assert/strict";
import test from "node:test";
import { OpenAIStreamDataLineParser } from "../dist/openai/stream/parsing/OpenAIStreamDataLineParser.js";

test("openai stream parser keeps reasoning content", () => {
  const parser = new OpenAIStreamDataLineParser();
  const parsed = parser.parse('data: {"choices":[{"delta":{"reasoning_content":"think","content":"answer"}}]}');
  assert.equal(parsed.reasoning, "think");
  assert.equal(parsed.text, "answer");
});
