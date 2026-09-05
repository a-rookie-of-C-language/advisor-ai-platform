import assert from "node:assert/strict";
import test from "node:test";
import { PromptBuilder } from "../dist/prompt/PromptBuilder.js";

test("prompt builder assembles system prompts in python order", () => {
  const messages = PromptBuilder.assembleMessages(
    [{ role: "user", content: "hello" }],
    {
      staticPrompts: ["static"],
      skillPrompts: ["skill"],
      dynamicPrompts: ["dynamic"]
    }
  );

  assert.deepEqual(messages.map((message) => message.role), ["system", "system", "system", "user"]);
  assert.deepEqual(messages.map((message) => message.content), ["static", "skill", "dynamic", "hello"]);
});
