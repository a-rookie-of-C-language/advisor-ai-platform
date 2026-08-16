import assert from "node:assert/strict";
import test from "node:test";
import { AgentGraphRunner } from "../dist/graph/core/AgentGraphRunner.js";

test("graph runner executes the Python parity node order", async () => {
  const events = [];
  const result = await new AgentGraphRunner({
    generate: async (state) => ({ ...state, assistantAnswer: "done" })
  }).run({ messages: [{ role: "user", content: "hello" }] }, undefined, (event) => events.push(event));
  assert.equal(result.assistantAnswer, "done");
  assert.deepEqual(events.filter((event) => event.status === "start").map((event) => event.node), [
    "select_skill", "load_memory", "decide_tool", "generate", "flush_memory", "finalize"
  ]);
});

test("graph runner stops before the next node when cancelled", async () => {
  const controller = new AbortController();
  const events = [];
  const runner = new AgentGraphRunner({
    select_skill: async (state) => { controller.abort(); return state; }
  });
  await assert.rejects(
    runner.run({ messages: [] }, controller.signal, (event) => events.push(event)),
    /aborted/
  );
  assert.deepEqual(events.filter((event) => event.status === "start").map((event) => event.node), ["select_skill"]);
});
