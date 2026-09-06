import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import { extractFirstUrl } from "../../../graph/helpers.js";
import type { ToolExplorerResult } from "../model/ToolExplorerResult.js";

export class ToolExplorer {
  explore(
    query: string,
    tools: readonly OpenAIChatTool[],
    routeCategories: ReadonlySet<string>,
    taskPlan?: JsonObject,
    observations: readonly JsonObject[] = [],
    recentMessages: readonly { role: string; content: string }[] = []
  ): ToolExplorerResult {
    const normalized = query.trim().toLowerCase();
    const readOnlyTools = tools.filter((tool) => Boolean(tool.meta?.readOnly));
    const candidateTools = readOnlyTools.length > 0 ? readOnlyTools : tools;
    const routeNames = new Set<string>();
    if (routeCategories.has("retrieval")) routeNames.add("rag_search");
    if (routeCategories.has("search")) routeNames.add("web_search");
    if (routeCategories.has("memory_read") || routeCategories.has("memory_write")) routeNames.add("memory");

    const plannedStep = this.selectPlannedStep(taskPlan, candidateTools, observations);
    if (plannedStep) {
      if (plannedStep === "final") {
        return this.buildResult([], "none", "");
      }
      return this.buildResult([plannedStep], "route_match", "tool explorer matched planned step");
    }

    const contextualFollowup = this.selectContextualFollowup(query, candidateTools, recentMessages, observations);
    if (contextualFollowup) {
      return this.buildResult([contextualFollowup], "text_match", "tool explorer matched contextual follow-up");
    }

    const matched = candidateTools
      .filter((tool) => {
        const name = tool.function.name.toLowerCase();
        const text = `${name} ${tool.function.description.toLowerCase()}`;
        const searchHint = tool.meta?.searchHint ?? "";
        return [...routeNames].some((routeName) => name.includes(routeName)) ||
          (name.includes("web_fetch") && extractFirstUrl(query).length > 0) ||
          (normalized.length > 0 && normalized.split(/\s+/u).some((token) => token.length > 1 && `${text} ${searchHint}`.includes(token)));
      })
      .map((tool) => tool.function.name);

    if (matched.length === 0) {
      return this.buildResult([], "none", "");
    }
    return this.buildResult(matched, routeNames.size > 0 ? "route_match" : "text_match", "tool explorer matched tools");
  }

  private selectPlannedStep(
    taskPlan: JsonObject | undefined,
    availableTools: readonly OpenAIChatTool[],
    observations: readonly JsonObject[]
  ): string | "final" | undefined {
    if (!taskPlan || typeof taskPlan !== "object") {
      return undefined;
    }
    const rawSteps = Array.isArray(taskPlan.steps) ? taskPlan.steps : [];
    const allowed = new Set(availableTools.map((tool) => tool.function.name));
    const executed = new Set(
      observations
        .map((item) => String(item.tool_name ?? "").trim())
        .filter(Boolean)
    );
    for (const rawStep of rawSteps) {
      if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) continue;
      const step = rawStep as Record<string, unknown>;
      const action = String(step.action ?? "").trim().toLowerCase();
      if (action === "final") {
        return "final";
      }
      if (action !== "call_tool") continue;
      const toolName = String(step.tool_name ?? "").trim();
      if (!toolName || !allowed.has(toolName) || executed.has(toolName)) continue;
      return toolName;
    }
    return undefined;
  }

  private buildResult(matched: readonly string[], reason: ToolExplorerResult["reason"], summary: string): ToolExplorerResult {
    const unique = [...new Set(matched)];
    const toolCalls = unique.map((toolName) => ({
      tool_name: toolName,
      arguments: {},
      status: "matched",
      message: "tool explorer matched candidate"
    }));
    return {
      matchedTools: unique,
      reason,
      summary,
      evidence: toolCalls.map((call) => ({
        tool_name: call.tool_name,
        status: call.status,
        message: call.message,
        items: []
      })),
      toolCalls,
      sufficient: unique.length > 0
    };
  }

  private selectContextualFollowup(
    query: string,
    availableTools: readonly OpenAIChatTool[],
    recentMessages: readonly { role: string; content: string }[],
    observations: readonly JsonObject[]
  ): string | undefined {
    if (observations.length > 0) return undefined;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return undefined;
    const followupHints = ["具体", "哪些", "名单", "列表", "列出", "都有谁", "是谁"];
    if (!followupHints.some((hint) => normalized.includes(hint))) return undefined;
    const recentText = recentMessages
      .slice(-6)
      .map((message) => message.content || "")
      .join("\n")
      .toLowerCase();
    if (!recentText.includes("学生")) return undefined;
    const tool = availableTools.find((item) => item.function.name === "list_students" || item.function.name.endsWith("__list_students"));
    return tool?.function.name;
  }
}
