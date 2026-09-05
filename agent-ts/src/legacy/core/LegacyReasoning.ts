import type { JsonObject } from "../../common/json/types/JsonTypes.js";

export function shouldEmitPlanningReasoning(educationDomain: boolean, explorationQuery: boolean): boolean {
  return educationDomain || explorationQuery;
}

export function buildRouteReasoningPayload(routeCategories: readonly string[], matchedTools: readonly string[], educationDomain: boolean): JsonObject {
  return {
    stage: "route",
    message: `route=${routeCategories.join(",")} matched=${matchedTools.join(",")} education_domain=${educationDomain}`,
    categories: [...routeCategories],
    matched_tools: [...matchedTools]
  };
}

export function buildDelegateReasoningPayload(agentName: string): JsonObject {
  return {
    stage: "delegate",
    agent_name: agentName,
    message: `delegate to ${agentName}`
  };
}

export function buildPlanReasoningPayload(taskPlan: JsonObject): JsonObject {
  return {
    stage: "plan",
    message: "task plan generated",
    mode: String(taskPlan.mode || ""),
    summary: String(taskPlan.summary || "")
  };
}
