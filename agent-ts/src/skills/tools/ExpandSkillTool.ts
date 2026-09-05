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
        description: "展开指定技能的完整系统提示词",
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
    return {
      ok: true,
      status: "success",
      message: "skill expanded",
      content: this.skillRegistry.expandSkill(skillName)
    };
  }
}
