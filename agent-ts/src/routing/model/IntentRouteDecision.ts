export type IntentMatchMethod = "strong_rule" | "score" | "fallback" | "llm" | "none";

export class IntentRouteDecision {
  constructor(
    readonly categories: ReadonlySet<string>,
    readonly matchedBy: IntentMatchMethod,
    readonly confidence: number,
    readonly fallbackReason?: string,
    readonly scores: Readonly<Record<string, number>> = {},
    readonly matchedTools: readonly string[] = [],
    readonly reason = ""
  ) {}

  toEventPayload(): Record<string, unknown> {
    const categories = [...this.categories].sort();
    return {
      matched_by: this.matchedBy,
      confidence: this.confidence,
      fallback_reason: this.fallbackReason || "",
      categories,
      scores: this.scores,
      reason: this.reason,
      matched_tools: [...this.matchedTools],
      source: {
        decision: this.matchedBy,
        categories,
        matched_tools: [...this.matchedTools]
      }
    };
  }
}
