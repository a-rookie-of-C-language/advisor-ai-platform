import type { JsonObject } from "../common/json/types/JsonTypes.js";

const URL_PATTERN = /https?:\/\/[^\s)>"]+/u;
const RAG_PRIORITY_HINTS = new Set(["知识库", "资料", "文档", "根据", "出处", "辅导员", "学生"]);
const REALTIME_HINTS = new Set(["天气", "实时", "今天", "明天", "新闻", "股价", "汇率", "比分", "最新", "现在", "目前"]);

export function stripSurrogates(text: string): string {
  if (!text) return text;
  return [...text].filter((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return !(code >= 0xd800 && code <= 0xdfff);
  }).join("");
}

export function preferRagOnly(query: string): boolean {
  const normalized = stripSurrogates(query).trim().toLowerCase();
  if (!normalized) return false;
  const hasRagHint = [...RAG_PRIORITY_HINTS].some((key) => normalized.includes(key.toLowerCase()));
  const hasRealtimeHint = [...REALTIME_HINTS].some((key) => normalized.includes(key.toLowerCase()));
  return hasRagHint && !hasRealtimeHint;
}

export function shouldForceEducationRag(query: string): boolean {
  const normalized = stripSurrogates(query).trim().toLowerCase();
  if (!normalized) return false;
  if ([...REALTIME_HINTS].some((key) => normalized.includes(key.toLowerCase()))) {
    return false;
  }
  const educationHints = [
    "辅导员",
    "学生",
    "学工",
    "学生工作",
    "育人",
    "资助",
    "奖助",
    "宿舍",
    "心理",
    "思政",
    "班级",
    "就业",
    "评优",
    "处分",
    "政策",
    "制度",
    "校园",
    "高校",
    "大学",
    "教育"
  ];
  return educationHints.some((hint) => normalized.includes(hint.toLowerCase()));
}

export function buildRagContextPrompt(items: readonly JsonObject[]): string {
  if (!items.length) return "";
  const lines = ["以下是知识库检索结果，请优先依据它回答："];
  for (const item of items) {
    const snippet = String(item.snippet ?? item.text ?? "").trim();
    if (!snippet) continue;
    const docName = String(item.docName ?? item.title ?? "").trim();
    lines.push(docName ? `- [${docName}] ${snippet}` : `- ${snippet}`);
  }
  return lines.join("\n");
}

export function buildRouteReasoning(
  routeCategories: readonly string[],
  matchedTools: readonly string[],
  educationDomain: boolean
): string {
  const categories = [...routeCategories].map((item) => item.trim()).filter(Boolean);
  const tools = [...matchedTools].map((item) => item.trim()).filter(Boolean);
  if (educationDomain) {
    return "识别到辅导员或学生工作类问题，先走知识库检索，再根据证据决定是否补充网络信息。";
  }
  if (categories.includes("retrieval") && categories.includes("search")) {
    return "问题同时涉及本地知识和外部资料，先检索知识库，再补充最新信息。";
  }
  if (categories.includes("retrieval")) {
    return "问题更适合先查知识库，优先使用本地资料回答。";
  }
  if (categories.includes("search")) {
    return "问题带有时效性或外部信息线索，先补充网络资料。";
  }
  if (tools.length > 0) {
    return `路由命中工具 ${tools.join(", ")}，将按匹配结果继续。`;
  }
  return "当前没有命中明确工具，将按通用计划继续。";
}

export function buildPlanReasoning(taskPlan: JsonObject | undefined): string {
  if (!taskPlan || typeof taskPlan !== "object") {
    return "未生成任务计划，直接进入回答。";
  }
  const mode = String(taskPlan.mode ?? "").trim().toLowerCase();
  const summary = String(taskPlan.summary ?? "").trim();
  const rawSteps = Array.isArray(taskPlan.steps) ? taskPlan.steps : [];
  const toolSteps: string[] = [];
  for (const rawStep of rawSteps) {
    if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) continue;
    const step = rawStep as Record<string, unknown>;
    if (String(step.action ?? "").trim().toLowerCase() !== "call_tool") continue;
    const toolName = String(step.tool_name ?? step.toolName ?? "").trim();
    if (toolName && !toolSteps.includes(toolName)) {
      toolSteps.push(toolName);
    }
  }
  if (mode === "direct") {
    return summary || "计划判断无需额外工具，直接生成回答。";
  }
  if (toolSteps.length > 0) {
    const chain = toolSteps.join(" -> ");
    return `${summary ? `${summary}：` : ""}先执行 ${chain}，再汇总结果。`;
  }
  return summary || "已生成执行计划，继续推进。";
}

export function buildDelegateReasoning(agentName: string, purpose = ""): string {
  const normalized = agentName.trim();
  if (normalized === "task_planner_subagent") {
    return "委托任务规划器生成更清晰的执行计划。";
  }
  if (normalized === "tool_explorer_subagent") {
    return "委托工具探索器按计划补充证据，并整理可回答的依据。";
  }
  if (purpose) {
    return `委托 ${normalized} 处理当前阶段任务：${purpose}`;
  }
  return `委托 ${normalized} 处理当前阶段任务。`;
}

export function extractFirstUrl(text: string): string {
  return URL_PATTERN.exec(text || "")?.[0] ?? "";
}

export function parseSkillNames(text: string, knownNames: readonly string[] = []): string[] {
  const match = /\[.*?\]/su.exec(text);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter((name): name is string => typeof name === "string");
      }
    } catch {
      // ignore
    }
  }
  if (knownNames.length > 0) {
    const lowerText = text.toLowerCase();
    return knownNames.filter((name) => lowerText.includes(name.toLowerCase()));
  }
  return [];
}
