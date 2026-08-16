export type IntentMatchMethod = "strong_rule" | "score" | "fallback" | "none";

export class IntentRouteDecision {
  constructor(
    readonly categories: ReadonlySet<string>,
    readonly matchedBy: IntentMatchMethod,
    readonly confidence: number,
    readonly fallbackReason?: string,
    readonly scores: Readonly<Record<string, number>> = {},
    readonly matchedTools: readonly string[] = []
  ) {}
}
