import type { OpenAIChatTool } from "../../openai/chat/model/tool/OpenAIChatTool.js";
import type { TaskPlan, TaskPlanInput, TaskPlanStep } from "../model/TaskPlan.js";

export class TaskPlanner {
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
}
