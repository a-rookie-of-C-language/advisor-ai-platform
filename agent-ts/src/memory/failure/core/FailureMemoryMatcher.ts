import type { FailureMemoryItem } from "../model/FailureMemoryItem.js";

export class FailureMemoryMatcher {
  match(query: string, memories: readonly FailureMemoryItem[]): { item: FailureMemoryItem; similarity: number } | undefined {
    const queryTokens = this.tokenize(query);
    if (queryTokens.size === 0) return undefined;
    let best: FailureMemoryItem | undefined;
    let bestScore = 0;
    for (const item of memories) {
      if (!item.userQuery) continue;
      if (query.includes(item.userQuery) || item.userQuery.includes(query)) {
        return { item, similarity: 0.9 };
      }
      const itemTokens = this.tokenize(item.userQuery);
      const intersection = [...queryTokens].filter((token) => itemTokens.has(token)).length;
      const union = new Set([...queryTokens, ...itemTokens]).size;
      const score = union === 0 ? 0 : intersection / union;
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    }
    return best && bestScore >= 0.35 ? { item: best, similarity: Number(bestScore.toFixed(4)) } : undefined;
  }

  private tokenize(text: string): Set<string> {
    return new Set(text.toLowerCase().trim().split(/[\s,，。！？；：、]+/u).filter(Boolean));
  }
}
