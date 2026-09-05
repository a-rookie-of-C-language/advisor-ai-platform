import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import { buildDelegateReasoning, buildPlanReasoning, buildRouteReasoning } from "../../graph/helpers.js";

export function shouldEmitPlanningReasoning(educationDomain: boolean, explorationQuery: boolean): boolean {
  return educationDomain || explorationQuery;
}

export function buildRouteReasoningPayload(routeCategories: readonly string[], matchedTools: readonly string[], educationDomain: boolean): JsonObject {
  return {
    stage: "route",
    message: buildRouteReasoning(routeCategories, matchedTools, educationDomain),
    categories: [...routeCategories],
    matched_tools: [...matchedTools]
  };
}

export function buildDelegateReasoningPayload(agentName: string): JsonObject {
  return {
    stage: "delegate",
    agent_name: agentName,
    message: buildDelegateReasoning(agentName)
  };
}

export function buildPlanReasoningPayload(taskPlan: JsonObject): JsonObject {
  return {
    stage: "plan",
    message: buildPlanReasoning(taskPlan),
    mode: String(taskPlan.mode || ""),
    summary: String(taskPlan.summary || "")
  };
}
