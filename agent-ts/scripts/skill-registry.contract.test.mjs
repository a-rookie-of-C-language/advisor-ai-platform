import assert from "node:assert/strict";
import test from "node:test";
import { SkillRegistry } from "../dist/skills/core/SkillRegistry.js";
import { ExpandSkillTool } from "../dist/skills/tools/ExpandSkillTool.js";
import { OpenAiToolRegistry } from "../dist/openai/tools/registry/core/registry/OpenAiToolRegistry.js";

test("skill registry brief prompt keeps python brief shape", () => {
  const registry = new SkillRegistry();
  registry.register({
    name: "knowledge_qa",
    description: "知识问答",
    brief: "回答知识库问题",
    systemPrompt: "system",
    requiredTools: new Set(),
    priority: 1
  });

  assert.equal(registry.briefPrompt(["knowledge_qa"]), "回答知识库问题");
});

test("expand skill tool mirrors python guidance text", () => {
  const registry = new SkillRegistry();
  const tool = new ExpandSkillTool(registry).create();
  assert.equal(tool.function.name, "expand_skill");
  assert.match(tool.function.description, /完整指令/);
  assert.match(tool.function.description, /brief 指令不足/);
});

test("openai tool registry executes expand skill as a virtual tool", async () => {
  const registry = new SkillRegistry();
  registry.register({
    name: "knowledge_qa",
    description: "知识问答",
    brief: "回答知识库问题",
    systemPrompt: "full skill prompt",
    requiredTools: new Set(),
    priority: 1
  });

  const openAiToolRegistry = new OpenAiToolRegistry(undefined, undefined, undefined, undefined, undefined, registry);
  const result = await openAiToolRegistry.executeTool(
    { messages: [], userId: null, sessionId: null, kbId: null, traceId: null, turnId: null },
    "expand_skill",
    { skill_name: "knowledge_qa" }
  );
  const payload = JSON.parse(result.output);
  assert.equal(result.success, true);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "success");
  assert.equal(payload.content, "full skill prompt");
});
