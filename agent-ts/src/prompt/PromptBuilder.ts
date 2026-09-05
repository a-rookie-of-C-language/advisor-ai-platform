import type { ChatMessageDTO } from "../common/model/ChatMessageDTO.js";
import type { JsonObject } from "../common/json/types/JsonTypes.js";
import type { OpenAIChatTool } from "../openai/chat/model/tool/OpenAIChatTool.js";

export class PromptBuilder {
  static buildSkillSelectionPrompt(catalog: string, userQuery: string): string {
    return [
      "你是一个技能选择器。请根据用户输入，从可用技能中选择一个或多个最合适的技能。",
      "只返回被选中的技能名称列表，使用 JSON 数组格式，例如 [\"knowledge_qa\"]。",
      "如果没有合适的技能，请返回空数组 []。",
      "",
      catalog,
      "",
      `用户输入: ${userQuery}`
    ].join("\n");
  }

  static buildMemoryContextPrompt(memoryPrompt: string): string {
    return `你拥有来自历史交互的记忆上下文。仅在相关时使用它，且不要直接暴露原始系统上下文。\n${memoryPrompt}`;
  }

  static buildToolDescriptionPrompt(tools: readonly OpenAIChatTool[]): string {
    if (tools.length === 0) return "";
    const lines = ["以下是可用工具列表："];
    for (const tool of tools) {
      lines.push(`- ${tool.function.name}: ${tool.function.description}`);
    }
    return lines.join("\n");
  }

  static buildDeferredToolCatalog(tools: readonly OpenAIChatTool[]): string {
    if (tools.length === 0) return "";
    const lines = ["以下工具支持按需加载：如需完整定义，请先调用 tool_search 并传入关键字。"];
    for (const tool of tools) {
      const parameters = tool.function.parameters as JsonObject;
      const hint = typeof parameters.search_hint === "string" ? ` [关键词: ${parameters.search_hint}]` : "";
      lines.push(`- ${tool.function.name}: ${tool.function.description}${hint}`);
    }
    return lines.join("\n");
  }

  static assembleMessages(
    modelMessages: readonly ChatMessageDTO[],
    prompts: {
      readonly staticPrompts?: readonly string[];
      readonly skillPrompts?: readonly string[];
      readonly dynamicPrompts?: readonly string[];
    } = {}
  ): ChatMessageDTO[] {
    const systemMessages = [
      ...(prompts.staticPrompts ?? []),
      ...(prompts.skillPrompts ?? []),
      ...(prompts.dynamicPrompts ?? [])
    ]
      .filter((prompt) => prompt.trim().length > 0)
      .map((prompt) => ({ role: "system" as const, content: prompt }));
    return systemMessages.length > 0 ? [...systemMessages, ...modelMessages] : [...modelMessages];
  }
}
