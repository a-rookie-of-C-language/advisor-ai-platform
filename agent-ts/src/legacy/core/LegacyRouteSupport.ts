import { IntentRouteDecision } from "../../routing/model/IntentRouteDecision.js";

export interface LegacyRouteContext {
  readonly categories: readonly string[];
  readonly matchedTools: readonly string[];
  readonly matchedBy: string;
  readonly confidence: number;
  readonly educationDomain: boolean;
  readonly preferredTools: readonly string[];
}

export function buildLegacyRouteContext(
  routeDecision: IntentRouteDecision,
  matchedTools: readonly string[],
  educationDomain: boolean
): LegacyRouteContext {
  return {
    categories: [...routeDecision.categories].sort(),
    matchedTools,
    matchedBy: routeDecision.matchedBy,
    confidence: routeDecision.confidence,
    educationDomain,
    preferredTools: educationDomain ? ["rag_search"] : []
  };
}

export function preferRetrievalFallback(routeDecision: IntentRouteDecision, hasRagTool: boolean): IntentRouteDecision {
  if (!hasRagTool) return routeDecision;
  if (routeDecision.categories.size === 1 && routeDecision.categories.has("retrieval")) return routeDecision;
  if (routeDecision.matchedBy === "fallback" || routeDecision.matchedBy === "strong_rule" || routeDecision.matchedBy === "score") {
    return new IntentRouteDecision(new Set(["retrieval"]), "fallback", 0.2, routeDecision.fallbackReason || "prefer_retrieval", routeDecision.scores, routeDecision.matchedTools);
  }
  return routeDecision;
}
