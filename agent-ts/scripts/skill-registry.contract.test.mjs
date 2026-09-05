import assert from "node:assert/strict";
import test from "node:test";
import { SkillRegistry } from "../dist/skills/core/SkillRegistry.js";

test("skill registry overwrites duplicate skill names and keeps priority ordering", () => {
  const registry = new SkillRegistry();
  registry.register({
    name: "demo",
    description: "first",
    brief: "first brief",
    systemPrompt: "first prompt",
    requiredTools: new Set(["rag_search"]),
    priority: 1
  });
  registry.register({
    name: "demo",
    description: "second",
    brief: "second brief",
    systemPrompt: "second prompt",
    requiredTools: new Set(["web_search"]),
    priority: 10
  });

  const skill = registry.get("demo");
  assert.equal(skill?.description, "second");
  assert.deepEqual(registry.listAll().map((item) => item.priority), [10]);
  assert.match(registry.catalogPrompt(), /demo/);
  assert.match(registry.briefPrompt(["demo"]), /second brief/);
  assert.equal(registry.expandSkill("demo"), "second prompt");
});
