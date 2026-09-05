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

  static buildFailureAvoidPrompt(matched: JsonObject): string {
    const memory = matched.memory && typeof matched.memory === "object" && !Array.isArray(matched.memory)
      ? (matched.memory as JsonObject)
      : {};
    const reasons = Array.isArray(memory.reasons) ? memory.reasons : [];
    const strategy = typeof memory.avoid_strategy === "string" ? memory.avoid_strategy.trim() : "";
    if (reasons.length === 0 && !strategy) {
      return "";
    }
    const parts = [
      "你有一个与当前问题相似的历史失败模式。",
      "请避免重复同样的错误。"
    ];
    if (reasons.length > 0) {
      parts.push(`失败原因: ${JSON.stringify(reasons)}`);
    }
    if (strategy) {
      parts.push(`建议策略: ${strategy}`);
    }
    return parts.join("\n");
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

  static buildSceneDetectionPrompt(userQuery: string): string {
    return [
      "请判断用户问题属于哪一类场景，并仅返回 JSON：",
      '{"scene": "product_query" | "policy_query" | "general", "confidence": 0.0~1.0}',
      "",
      "- product_query: 用户在询问具体产品、功能、规格、使用方式或选型建议。",
      "- policy_query: 用户在询问规则、制度、政策、流程、标准或约束。",
      "- general: 既不属于产品问题，也不属于政策问题。",
      "",
      `用户问题: ${userQuery}`
    ].join("\n");
  }

  static buildIntentRoutingPrompt(categoryDescriptions: readonly string[], userQuery: string): string {
    const categoryBlock = categoryDescriptions.map((item) => `- ${item}`).join("\n");
    return [
      "你是一个高精度工具路由器。请根据用户问题和候选分类，选择最合适的一个或多个分类。",
      "仅返回 JSON，不要输出解释。",
      '{"categories": ["category1"], "confidence": 0.0, "reason": "选择原因"}',
      "",
      "可选分类如下：",
      categoryBlock,
      "",
      `用户问题: ${userQuery}`
    ].join("\n");
  }

  static buildConflictHintPrompt(conflictHint: string): string {
    return conflictHint;
  }

  static buildTaskPlanPromptPayload(
    userQuery: string,
    recentMessages: readonly ChatMessageDTO[],
    availableTools: readonly OpenAIChatTool[],
    routeContext: JsonObject
  ): JsonObject {
    return {
      user_query: userQuery,
      recent_messages: this.compactMessages(recentMessages),
      route_context: routeContext,
      available_tools: availableTools.map((tool) => this.toPromptToolItem(tool))
    };
  }

  static renderTaskPlanPrompt(taskPlan: JsonObject): string {
    return [
      "下面是本轮执行计划，请严格遵循计划中的步骤和工具顺序。",
      "如果计划已经收集到足够证据，就直接基于证据回答；如果计划要求继续补充，再继续按 ReAct 方式调用工具。",
      JSON.stringify(taskPlan)
    ].join("\n");
  }

  static buildE2EJudgePrompt(query: string, expectedAnswer: string, actualAnswer: string): string {
    return [
      "你是一个评估专家。请对以下回答进行评分。",
      "",
      `问题：${query}`,
      "",
      `期望答案：${expectedAnswer}`,
      "",
      `实际答案：${actualAnswer}`,
      "",
      "请从以下四个维度评分（1-5分）：",
      "- relevance（相关性）：回答是否与问题相关",
      "- completeness（完整性）：回答是否涵盖了期望答案的要点",
      "- accuracy（准确性）：回答是否准确无误",
      "- fluency（流畅性）：回答是否通顺、易读",
      "",
      '返回 JSON 格式：{"relevance": 1-5, "completeness": 1-5, "accuracy": 1-5, "fluency": 1-5, "reasoning": "评分理由"}'
    ].join("\n");
  }

  static buildDeepEvalPrompt(query: string, expectedAnswer: string, actualAnswer: string, retrievalContext: readonly string[]): string {
    return [
      "你是一个评估专家，请严格返回 JSON。",
      `问题: ${query}`,
      `期望答案: ${expectedAnswer}`,
      `实际答案: ${actualAnswer}`,
      `检索上下文: ${retrievalContext.join(" || ")}`,
      "请返回包含以下字段的 JSON: 忠实度, 答案相关性, 上下文精度, 上下文召回率, 上下文相关性, 幻觉检测, 偏见检测, 毒性检测, 隐私泄露检测, 相关性, 连贯性, 完整性。每个字段格式为 {\"score\": 0-1, \"reason\": \"...\", \"success\": true/false, \"threshold\": 0.8}。另外返回 avg_score 和 method。"
    ].join("\n");
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

  private static compactMessages(messages: readonly ChatMessageDTO[]): JsonObject[] {
    return messages.slice(-8).map((message) => ({
      role: message.role,
      content: (message.content ?? "").slice(0, 1200)
    }));
  }

  private static toPromptToolItem(tool: OpenAIChatTool): JsonObject {
    return {
      name: tool.function.name,
      description: tool.function.description.slice(0, 800),
      category: "",
      read_only: false,
      defer_loading: false
    };
  }
}
