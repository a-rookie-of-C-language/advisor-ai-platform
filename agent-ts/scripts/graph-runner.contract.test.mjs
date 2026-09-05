import assert from "node:assert/strict";
import test from "node:test";
import { AgentGraphRunner } from "../dist/graph/core/AgentGraphRunner.js";
import { buildDefaultSkillRegistry } from "../dist/skills/preset/buildDefaultSkillRegistry.js";

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

test("graph runner selects skills by parsed names before falling back", async () => {
  const registry = buildDefaultSkillRegistry();
  const result = await new AgentGraphRunner({}, registry).run({
    messages: [{ role: "user", content: "展开技能 [\"web_research\"]" }],
    userQuery: "展开技能 [\"web_research\"]"
  });
  assert.deepEqual(result.activeSkills, ["web_research"]);
  assert.ok(result.skillSystemPrompt?.includes("用 web_search 搜索互联网"));
});

test("graph runner leaves skills empty when no skill names are parsed", async () => {
  const registry = buildDefaultSkillRegistry();
  const result = await new AgentGraphRunner({}, registry).run({
    messages: [{ role: "user", content: "普通问题" }],
    userQuery: "普通问题"
  });
  assert.deepEqual(result.activeSkills, []);
  assert.equal(result.skillSystemPrompt, "");
});
