import type { JsonObject } from "../../common/json/types/JsonTypes.js";

export interface EvalJudgeScore extends JsonObject {
  readonly relevance: number;
  readonly completeness: number;
  readonly accuracy: number;
  readonly fluency: number;
  readonly avg_score: number;
  readonly reasoning: string;
}

export class EvalJudge {
  static judge(query: string, expectedAnswer: string, actualAnswer: string): EvalJudgeScore {
    const relevance = this.scoreOverlap(query, actualAnswer);
    const completeness = this.scoreOverlap(expectedAnswer, actualAnswer);
    const accuracy = this.scoreExactness(expectedAnswer, actualAnswer);
    const fluency = this.scoreFluency(actualAnswer);
    const avg_score = Number((relevance * 0.3 + completeness * 0.25 + accuracy * 0.3 + fluency * 0.15).toFixed(2));
    return {
      relevance,
      completeness,
      accuracy,
      fluency,
      avg_score,
      reasoning: "heuristic judge"
    };
  }

  private static scoreOverlap(left: string, right: string): number {
    const leftWords = new Set(left.trim().toLowerCase().split(/\s+/).filter(Boolean));
    const rightWords = new Set(right.trim().toLowerCase().split(/\s+/).filter(Boolean));
    if (leftWords.size === 0 || rightWords.size === 0) {
      return 0;
    }
    let overlap = 0;
    for (const word of leftWords) {
      if (rightWords.has(word)) overlap++;
    }
    return Number(((overlap / leftWords.size) * 5).toFixed(2));
  }

  private static scoreExactness(expectedAnswer: string, actualAnswer: string): number {
    if (!expectedAnswer.trim() || !actualAnswer.trim()) {
      return 0;
    }
    return expectedAnswer.trim() === actualAnswer.trim() ? 5 : 2;
  }

  private static scoreFluency(actualAnswer: string): number {
    if (!actualAnswer.trim()) return 0;
    const sentences = actualAnswer.split(/[。.!?]/).filter(Boolean).length;
    const lengthScore = Math.min(5, Math.max(1, Math.round(actualAnswer.length / 40)));
    return Math.min(5, Math.max(1, Math.round((lengthScore + Math.min(5, sentences)) / 2)));
  }
}
