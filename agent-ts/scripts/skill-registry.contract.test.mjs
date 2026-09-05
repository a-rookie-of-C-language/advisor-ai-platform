import assert from "node:assert/strict";
import test from "node:test";
import { SkillRegistry } from "../dist/skills/core/SkillRegistry.js";
import { ExpandSkillTool } from "../dist/skills/tools/ExpandSkillTool.js";

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
