import type { JsonObject } from "../../common/json/types/JsonObject.js";
import type { OpenAIChatTool } from "../../openai/chat/model/tool/OpenAIChatTool.js";
import type { AgentConfig } from "../../config/model/core/AgentConfig.js";
import { OpenAIChatClient } from "../../openai/chat/core/client/OpenAIChatClient.js";
import type { ChatMessageDTO } from "../../common/model/ChatStreamRequest.js";
import type { TaskPlan, TaskPlanInput, TaskPlanStep } from "../model/TaskPlan.js";

export class TaskPlanner {
  constructor(private readonly config?: AgentConfig, private readonly chatClient?: OpenAIChatClient) {}

  async planAsync(input: TaskPlanInput): Promise<TaskPlan> {
    const fallback = this.plan(input);
    if (!this.config || !this.chatClient || !this.config.openAiApiKey) {
      return fallback;
    }
    try {
      const messages = this.buildPromptMessages(input);
      const responseText = await this.collectPlanText(messages);
      const parsed = this.parsePlanText(responseText);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  plan(input: TaskPlanInput): TaskPlan {
    const query = input.userQuery.trim();
    const available = new Map(input.availableTools.map((tool) => [tool.function.name, tool]));
    const routeContext = input.routeContext && typeof input.routeContext === "object" && !Array.isArray(input.routeContext)
      ? input.routeContext
      : {};
    const categories = new Set(this.coerceNames(routeContext.categories));
    const matched = this.coerceNames(routeContext.matched_tools);
    const preferred = this.coerceNames(routeContext.preferred_tools);
    const steps: TaskPlanStep[] = [];

    const education = /辅导员|学生|班主任|学校|学院|规章|制度|政策|教育|课程|培训|培养|核心素养/i.test(query);
    const realtime = /最新|今天|现在|近期|课程|培训|公开|资源|通知|官网|新闻|日期|星期/i.test(query);
    if (available.has("rag_search") && (categories.has("retrieval") || preferred.includes("rag_search") || education || matched.includes("rag_search"))) {
      steps.push({
        action: "call_tool",
        toolName: "rag_search",
        arguments: { query, top_k: 5 },
        reason: "先检索知识库，补足制度、理论和场景背景",
        expectedOutcome: "得到可用于回答的知识库片段",
        sufficient: false
      });
    }
    if (available.has("web_search") && (categories.has("search") || realtime) && query) {
      steps.push({
        action: "call_tool",
        toolName: "web_search",
        arguments: { query, max_results: 5 },
        reason: "补充最新公开信息或外部资源",
        expectedOutcome: "得到可引用的外部信息",
        sufficient: false
      });
    }
    if (steps.length === 0) {
      return {
        mode: "direct",
        goal: query || "回答用户问题",
        summary: "当前问题不需要额外工具，直接生成回答。",
        stopWhen: "可以直接回答用户问题",
        sufficient: true,
        requiredTools: [],
        steps: [{ action: "final", reason: "当前问题无需工具", sufficient: true }],
        routeContext,
        source: "fallback"
      };
    }
    const requiredTools = [...new Set([...matched, ...steps.flatMap((step) => step.toolName ? [step.toolName] : [])])];
    return {
      mode: "plan_and_execute",
      goal: query || "回答用户问题",
      summary: "先检索再回答",
      stopWhen: "已收集到足够证据并能直接回答用户问题",
      sufficient: false,
      requiredTools,
      steps,
      routeContext,
      source: "fallback"
    };
  }

  prioritizeTools(tools: readonly OpenAIChatTool[], plan: TaskPlan | undefined): OpenAIChatTool[] {
    if (!plan || plan.requiredTools.length === 0) return [...tools];
    const byName = new Map(tools.map((tool) => [tool.function.name, tool]));
    const prioritized = plan.requiredTools.flatMap((name) => {
      const tool = byName.get(name);
      return tool ? [tool] : [];
    });
    const selected = new Set(prioritized.map((tool) => tool.function.name));
    return [...prioritized, ...tools.filter((tool) => !selected.has(tool.function.name))];
  }

  private coerceNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  private buildPromptMessages(input: TaskPlanInput): ChatMessageDTO[] {
    const routeContext = input.routeContext && typeof input.routeContext === "object" && !Array.isArray(input.routeContext)
      ? input.routeContext
      : {};
    const payload = {
      user_query: input.userQuery,
      route_context: routeContext,
      available_tools: input.availableTools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        read_only: Boolean(tool.meta?.readOnly),
        search_hint: tool.meta?.searchHint ?? ""
      }))
    };
    return [
      {
        role: "system",
        content: [
          "你是辅导员平台的任务规划器。你的任务不是直接回答问题，而是在执行前产出一份可执行计划。",
          "只返回严格 JSON。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2)
      }
    ];
  }

  private async collectPlanText(messages: ChatMessageDTO[]): Promise<string> {
    let responseText = "";
    for await (const delta of this.chatClient!.streamChat(messages, undefined)) {
      responseText += delta;
    }
    return responseText;
  }

  private parsePlanText(text: string): TaskPlan | null {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      return this.normalizeParsedPlan(parsed);
    } catch {
      return null;
    }
  }

  private normalizeParsedPlan(payload: Record<string, unknown>): TaskPlan | null {
    const mode = String(payload.mode ?? "plan_and_execute").trim().toLowerCase();
    const normalizedMode = mode === "direct" ? "direct" : "plan_and_execute";
    const goal = String(payload.goal ?? "").trim();
    const summary = String(payload.summary ?? "").trim();
    const stopWhen = String(payload.stop_when ?? payload.stopWhen ?? "").trim();
    const sufficient = Boolean(payload.sufficient);
    const routeContext = this.toJsonObject(payload.route_context);
    const allowedTools = new Set(this.coerceNames(payload.required_tools));
    const steps = Array.isArray(payload.steps)
      ? payload.steps.flatMap((rawStep) => {
          if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) return [];
          const step = rawStep as Record<string, unknown>;
          const action = String(step.action ?? "").trim().toLowerCase();
          if (action !== "call_tool" && action !== "final") return [];
          const toolName = String(step.tool_name ?? "").trim();
          if (action === "call_tool" && toolName && allowedTools.size > 0 && !allowedTools.has(toolName)) {
            return [];
          }
          const argumentsValue = this.toJsonObject(step.arguments);
          const normalizedStep: TaskPlanStep = {
            action,
            toolName: toolName || undefined,
            arguments: argumentsValue,
            reason: String(step.reason ?? "").trim(),
            expectedOutcome: String(step.expected_outcome ?? step.expectedOutcome ?? "").trim() || undefined,
            sufficient: Boolean(step.sufficient)
          };
          if (action === "final") {
            return [{ ...normalizedStep, toolName: undefined }];
          }
          return [normalizedStep];
        })
      : [];
    if (!steps.length) return null;
    const requiredTools = this.coerceNames(payload.required_tools).filter((name) => !allowedTools.size || allowedTools.has(name));
    return {
      mode: normalizedMode,
      goal: goal || "回答用户问题",
      summary,
      stopWhen,
      sufficient,
      requiredTools,
      steps,
      routeContext,
      source: "fallback"
    };
  }

  private toJsonObject(value: unknown): JsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: JsonObject = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (raw === null) {
        result[key] = null;
      } else if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
        result[key] = raw;
      } else if (Array.isArray(raw)) {
        result[key] = raw.map((item) => (item && typeof item === "object" && !Array.isArray(item) ? this.toJsonObject(item) : item as never)) as never;
      } else if (typeof raw === "object") {
        result[key] = this.toJsonObject(raw);
      }
    }
    return result;
  }
}
