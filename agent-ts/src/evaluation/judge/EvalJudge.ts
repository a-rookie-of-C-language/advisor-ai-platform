import { PromptBuilder } from "../../prompt/PromptBuilder.js";
import type { EvalConfigValues } from "../../config/model/values/EvalConfigValues.js";

export interface EvalJudgeScore {
  readonly relevance?: number;
  readonly completeness?: number;
  readonly accuracy?: number;
  readonly fluency?: number;
  readonly avg_score: number;
  readonly reasoning?: string;
  readonly error?: string;
}

export interface EvalJudgeConfig {
  readonly model?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

type EvalJudgePayload = Record<string, unknown>;

export class EvalJudge {
  static async judge(query: string, expectedAnswer: string, actualAnswer: string, config: EvalJudgeConfig = {}): Promise<EvalJudgeScore> {
    const external = await this.tryExternalJudge(query, expectedAnswer, actualAnswer, config);
    if (external) {
      return external;
    }
    return {
      error: "no_llm_provider",
      avg_score: 0
    };
  }

  private static async tryExternalJudge(
    query: string,
    expectedAnswer: string,
    actualAnswer: string,
    config: EvalJudgeConfig
  ): Promise<EvalJudgeScore | null> {
    if (!config.apiKey || !config.baseUrl || !config.model) {
      return null;
    }

    const prompt = PromptBuilder.buildE2EJudgePrompt(query, expectedAnswer, actualAnswer);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: false
        })
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return null;
      }
      const parsed = JSON.parse(content) as EvalJudgePayload;
      const relevance = this.coerceNumber(parsed.relevance ?? 3);
      const completeness = this.coerceNumber(parsed.completeness ?? 3);
      const accuracy = this.coerceNumber(parsed.accuracy ?? 3);
      const fluency = this.coerceNumber(parsed.fluency ?? 3);
      const avg_score = Number((relevance * 0.3 + completeness * 0.25 + accuracy * 0.3 + fluency * 0.15).toFixed(2));
      return {
        relevance,
        completeness,
        accuracy,
        fluency,
        avg_score,
        reasoning: String(parsed.reasoning ?? "")
      };
    } catch {
      return null;
    }
  }

  static fromEvalConfig(config: EvalConfigValues): EvalJudgeConfig {
    return {
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    };
  }

  private static coerceNumber(value: unknown): number {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
