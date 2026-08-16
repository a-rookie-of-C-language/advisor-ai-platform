import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FailureMemoryStore } from "../dist/memory/failure/core/FailureMemoryStore.js";
import { FailureMemorySupport } from "../dist/memory/failure/core/FailureMemorySupport.js";

test("failure memory records low-score traces and injects a matched avoidance prompt", () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-failure-memory-"));
  try {
    const support = new FailureMemorySupport(new FailureMemoryStore(join(directory, "memory.jsonl")), 7);
    support.evaluateAndRecord("查询学生规章", [
      { type: "provider_request_end", turn: 1, status: "error", durationMs: 4, errorCode: "RATE_LIMIT" },
      { type: "tool_execution_end", turn: 1, toolCallId: "call-1", toolName: "rag_search", success: false, durationMs: 2 }
    ], "turn-1");
    const messages = support.injectAvoidancePrompt([{ role: "user", content: "查询学生规章" }], "查询学生规章");
    assert.equal(messages[0].role, "system");
    assert.match(messages[0].content, /历史失败经验/);
    assert.equal(messages.at(-1).role, "user");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("failure memory ignores successful traces", () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-failure-memory-"));
  try {
    const store = new FailureMemoryStore(join(directory, "memory.jsonl"));
    const support = new FailureMemorySupport(store, 7);
    support.evaluateAndRecord("普通问题", [
      { type: "provider_request_end", turn: 1, status: "success", durationMs: 3 }
    ], "turn-2");
    assert.deepEqual(store.loadRecent(), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
