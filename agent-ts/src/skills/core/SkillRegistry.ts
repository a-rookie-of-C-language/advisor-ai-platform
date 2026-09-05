import type { Skill } from "../model/Skill.js";

export class SkillRegistry {
  private readonly skills = new Map<string, Skill>();

  register(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      // 覆盖同名 skill 时保持 Python 版的可观察行为。
      console.warn(`Overwriting existing skill: ${skill.name}`);
    }
    this.skills.set(skill.name, skill);
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  listAll(): Skill[] {
    return [...this.skills.values()].sort((a, b) => b.priority - a.priority);
  }

  catalogPrompt(): string {
    const lines = ["Available skills:"];
    for (const skill of this.listAll()) {
      lines.push(`- ${skill.name}: ${skill.description}`);
    }
    return lines.join("\n");
  }

  briefPrompt(names: readonly string[]): string {
    const parts: string[] = [];
    for (const name of names) {
      const skill = this.get(name);
      if (skill) {
        parts.push(skill.brief);
      }
    }
    return parts.join("\n");
  }

  expandSkill(name: string): string {
    return this.get(name)?.systemPrompt ?? "";
  }
}
