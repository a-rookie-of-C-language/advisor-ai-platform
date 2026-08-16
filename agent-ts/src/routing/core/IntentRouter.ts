import { DEFAULT_READ_ONLY_CATEGORIES, INTENT_CATEGORY_ALIASES, INTENT_CATEGORY_RULES } from "../model/IntentCategoryRules.js";
import { IntentRouteDecision } from "../model/IntentRouteDecision.js";

export interface IntentRouterOptions {
  readonly scoreThreshold?: number;
  readonly allowDestructiveFallback?: boolean;
}

export class IntentRouter {
  private lastDecision = new IntentRouteDecision(new Set(), "none", 0);

  constructor(private readonly options: IntentRouterOptions = {}) {}

  get decision(): IntentRouteDecision {
    return this.lastDecision;
  }

  route(query: string, categories: Iterable<string> = Object.keys(INTENT_CATEGORY_RULES)): IntentRouteDecision {
    const allowed = this.normalizeCategories(categories);
    if (!query.trim()) return this.remember(this.fallback(allowed, "empty_query"));

    const scores: Record<string, number> = {};
    const strongMatches = new Set<string>();
    for (const category of allowed) {
      const rule = INTENT_CATEGORY_RULES[category];
      if (!rule) continue;
      if (rule.strong.some((pattern) => pattern.test(query))) {
        strongMatches.add(category);
        scores[category] = (scores[category] ?? 0) + 3;
      }
      const weakScore = rule.weak.filter((pattern) => pattern.test(query)).length;
      if (weakScore > 0) scores[category] = (scores[category] ?? 0) + weakScore;
    }

    if (strongMatches.size > 0) {
      return this.remember(new IntentRouteDecision(strongMatches, "strong_rule", 0.95, undefined, scores));
    }
    const threshold = this.options.scoreThreshold ?? 3;
    const scored = new Set(Object.entries(scores).filter(([, score]) => score >= threshold).map(([category]) => category));
    if (scored.size > 0) return this.remember(new IntentRouteDecision(scored, "score", 0.8, undefined, scores));
    return this.remember(this.fallback(allowed, "rule_score_miss", scores));
  }

  private fallback(categories: Set<string>, reason: string, scores: Readonly<Record<string, number>> = {}): IntentRouteDecision {
    const fallbackCategories = this.options.allowDestructiveFallback
      ? new Set(categories)
      : new Set([...categories].filter((category) => DEFAULT_READ_ONLY_CATEGORIES.has(category)));
    if (fallbackCategories.size === 0) for (const category of categories) fallbackCategories.add(category);
    return new IntentRouteDecision(fallbackCategories, "fallback", 0.2, reason, scores);
  }

  private normalizeCategories(categories: Iterable<string>): Set<string> {
    const normalized = new Set<string>();
    for (const category of categories) {
      const canonical = INTENT_CATEGORY_ALIASES[category] ?? category;
      if (INTENT_CATEGORY_RULES[canonical] || canonical === "meta") normalized.add(canonical);
    }
    return normalized;
  }

  private remember(decision: IntentRouteDecision): IntentRouteDecision {
    this.lastDecision = decision;
    return decision;
  }
}
