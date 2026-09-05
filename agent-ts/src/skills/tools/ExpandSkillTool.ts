import type { OpenAIChatTool } from "../../openai/chat/model/tool/OpenAIChatTool.js";
import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { SkillRegistry } from "../core/SkillRegistry.js";

export class ExpandSkillTool {
  constructor(private readonly skillRegistry: SkillRegistry) {}

  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "expand_skill",
        description: "展开指定技能的完整指令，获取更详细的执行指南。当 brief 指令不足以完成任务时调用。",
        parameters: {
          type: "object",
          properties: {
            skill_name: { type: "string" }
          },
          required: ["skill_name"]
        }
      }
    };
  }

  execute(skillName: string): JsonObject {
    const fullPrompt = this.skillRegistry.expandSkill(skillName);
    if (!fullPrompt) {
      return {
        ok: false,
        status: "error",
        message: `skill not found: ${skillName}`,
        items: []
      };
    }
    return {
      ok: true,
      status: "hit",
      message: `expanded skill: ${skillName}`,
      items: [
        {
          skill_name: skillName,
          full_prompt: fullPrompt
        }
      ]
    };
  }
}
