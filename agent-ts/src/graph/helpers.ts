import type { JsonObject } from "../common/json/types/JsonTypes.js";
import { PromptBuilder } from "../prompt/PromptBuilder.js";

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
  return PromptBuilder.buildRouteReasoningPrompt(routeCategories, matchedTools, educationDomain);
}

export function buildPlanReasoning(taskPlan: JsonObject | undefined): string {
  return PromptBuilder.buildPlanReasoningPrompt(taskPlan);
}

export function buildDelegateReasoning(agentName: string, purpose = ""): string {
  return PromptBuilder.buildDelegateReasoningPrompt(agentName, purpose);
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

export function buildSkillSelectionPrompt(catalogPrompt: string, userQuery: string): string {
  return [
    "你是一个技能选择器。请根据用户输入，从可用技能中选择一个或多个最合适的技能。",
    "只返回被选中的技能名称列表，使用 JSON 数组格式，例如 [\"knowledge_qa\"]。",
    "如果没有合适的技能，请返回空数组 []。",
    "",
    catalogPrompt,
    "",
    `用户输入: ${userQuery}`
  ].join("\n");
}
