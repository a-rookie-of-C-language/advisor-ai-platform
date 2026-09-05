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

test("graph runner leaves skills empty without a prompt selector", async () => {
  const registry = buildDefaultSkillRegistry();
  const result = await new AgentGraphRunner({}, registry).run({
    messages: [{ role: "user", content: "展开技能 [\"web_research\"]" }],
    userQuery: "展开技能 [\"web_research\"]"
  });
  assert.deepEqual(result.activeSkills, []);
  assert.equal(result.skillSystemPrompt, "");
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

test("graph runner can select skills through the prompt selector", async () => {
  const registry = buildDefaultSkillRegistry();
  let prompt = "";
  const result = await new AgentGraphRunner(
    {},
    registry,
    async (builtPrompt) => {
      prompt = builtPrompt;
      return '["knowledge_qa"]';
    }
  ).run({
    messages: [{ role: "user", content: "帮我查知识库" }],
    userQuery: "帮我查知识库"
  });
  assert.match(prompt, /技能选择器/);
  assert.deepEqual(result.activeSkills, ["knowledge_qa"]);
  assert.ok(result.skillSystemPrompt?.includes("rag_search"));
});
