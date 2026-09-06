import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PromptBuilder } from "../dist/prompt/PromptBuilder.js";
import { FailureMemoryStore } from "../dist/memory/failure/core/FailureMemoryStore.js";
import { FailureMemorySupport } from "../dist/memory/failure/core/FailureMemorySupport.js";

test("failure memory records low-score traces and injects a matched avoidance prompt", () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-failure-memory-"));
  try {
    const support = new FailureMemorySupport(new FailureMemoryStore(join(directory, "memory.jsonl")), 90);
    support.evaluateAndRecord("查询学生规章", [
      { event: "tool_call", source: "tool", payload: { tool_call_id: "call-1", tool_name: "rag_search", tool_args: {} } },
      {
        event: "tool_result",
        source: "tool",
        payload: {
          tool_call_id: "call-1",
          tool_name: "rag_search",
          tool_args: {},
          tool_output: "{\"status\":\"miss\"}",
          attempt: 1,
          success: false
        }
      }
    ], "turn-1");
    const messages = support.injectAvoidancePrompt([{ role: "user", content: "查询学生规章" }], "查询学生规章");
    assert.equal(messages[0].role, "system");
    assert.match(messages[0].content, /历史失败模式/);
    assert.match(messages[0].content, /避免重复同样的错误/);
    assert.equal(messages.at(-1).role, "user");
    assert.equal(PromptBuilder.buildMemoryContextPrompt("x").startsWith("你拥有来自历史交互的记忆上下文"), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("failure memory ignores successful traces", () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-failure-memory-"));
  try {
    const store = new FailureMemoryStore(join(directory, "memory.jsonl"));
    const support = new FailureMemorySupport(store, 90);
    support.evaluateAndRecord("普通问题", [
      { event: "llm_data", source: "llm", payload: { text: "hello" } }
    ], "turn-2");
    assert.deepEqual(store.loadRecent(), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
