import { SkillRegistry } from "../core/SkillRegistry.js";
import { KNOWLEDGE_QA, MEMORY_MANAGE, WEB_RESEARCH } from "./DefaultSkills.js";

export function buildDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();
  registry.register(KNOWLEDGE_QA);
  registry.register(WEB_RESEARCH);
  registry.register(MEMORY_MANAGE);
  return registry;
}
