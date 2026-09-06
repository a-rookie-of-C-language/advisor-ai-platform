import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { TaskPlan } from "../model/TaskPlan.js";

export interface PlannedToolStep {
  readonly toolName: string;
  readonly arguments: JsonObject;
  readonly reason: string;
}

export interface PlannedToolObservation {
  readonly tool_name: string;
  readonly status: string;
  readonly message: string;
  readonly items: readonly JsonObject[];
}

export function shouldUseDirectPlan(taskPlan: TaskPlan | JsonObject | undefined): boolean {
  return Boolean(taskPlan && typeof taskPlan === "object" && !Array.isArray(taskPlan) && String(taskPlan.mode ?? "").trim().toLowerCase() === "direct");
}

export function plannedToolSteps(taskPlan: TaskPlan | JsonObject | undefined): PlannedToolStep[] {
  if (!taskPlan || typeof taskPlan !== "object" || Array.isArray(taskPlan)) {
    return [];
  }
  const rawSteps = Array.isArray(taskPlan.steps) ? taskPlan.steps : [];
  const steps: PlannedToolStep[] = [];
  for (const rawStep of rawSteps) {
    if (!rawStep || typeof rawStep !== "object" || Array.isArray(rawStep)) continue;
    const step = rawStep as Record<string, unknown>;
    if (String(step.action ?? "").trim().toLowerCase() !== "call_tool") continue;
    const toolName = String(step.tool_name ?? step.toolName ?? "").trim();
    if (!toolName) continue;
    const argumentsValue = step.arguments && typeof step.arguments === "object" && !Array.isArray(step.arguments)
      ? (step.arguments as JsonObject)
      : {};
    steps.push({
      toolName,
      arguments: argumentsValue,
      reason: String(step.reason ?? "").trim()
    });
  }
  return steps;
}

export function buildPlannedToolContext(observations: readonly PlannedToolObservation[]): string {
  if (observations.length === 0) return "";
  const payload = JSON.stringify(observations, null, 2);
  return [
    "A read-only tool explorer has gathered evidence for the current user question.",
    "以下是后端按任务计划顺序执行工具后得到的证据。",
    "请基于这些证据和当前对话回答；如果证据不足，请说明缺口。",
    payload
  ].join("\n");
}
