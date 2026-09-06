import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import { PromptBuilder } from "../../prompt/PromptBuilder.js";
import type { EvalConfigValues } from "../../config/model/values/EvalConfigValues.js";
import { EvalBackendProbe } from "../probe/EvalBackendProbe.js";

type MetricScore = {
  readonly score: number;
  readonly reason: string;
  readonly success: boolean;
  readonly threshold: number;
};

type EvalDeepEvalResult = {
  readonly metrics: Record<string, MetricScore>;
  readonly avg_score: number;
  readonly method: string;
};

export interface EvalDeepEvalConfig {
  readonly model?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly available?: boolean;
}

export class EvalDeepEval {
  static async evaluate(
    query: string,
    expectedAnswer: string,
    actualAnswer: string,
    retrievalContext: readonly string[],
    config: EvalDeepEvalConfig = {}
  ): Promise<JsonObject> {
    if (config.available === false) {
      return {
        error: "no_deepeval_provider",
        avg_score: 0,
        method: "deepeval"
      };
    }
    const probedConfig = await this.probeConfig(config);
    if (probedConfig.available === false) {
      return {
        error: "no_deepeval_provider",
        avg_score: 0,
        method: "deepeval"
      };
    }
    const external = await this.tryExternalEvaluate(query, expectedAnswer, actualAnswer, retrievalContext, probedConfig);
    if (external) {
      return external;
    }
    return {
      error: "no_deepeval_provider",
      avg_score: 0,
      method: "deepeval"
    };
  }

  private static async tryExternalEvaluate(
    query: string,
    expectedAnswer: string,
    actualAnswer: string,
    retrievalContext: readonly string[],
    config: EvalDeepEvalConfig
  ): Promise<EvalDeepEvalResult | null> {
    if (!config.apiKey || !config.baseUrl || !config.model) {
      return null;
    }
    const prompt = PromptBuilder.buildDeepEvalPrompt(query, expectedAnswer, actualAnswer, retrievalContext);
    const body = {
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      stream: false
    };
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return null;
      }
      const parsed = JSON.parse(content) as JsonObject;
      return {
        metrics: this.coerceMetrics(parsed),
        avg_score: this.coerceNumber(parsed.avg_score ?? parsed.avgScore ?? 0),
        method: String(parsed.method ?? "external-deepeval")
      };
    } catch {
      return null;
    }
  }

  private static async probeConfig(config: EvalDeepEvalConfig): Promise<EvalDeepEvalConfig & { available?: boolean }> {
    if (config.available === false) {
      return config;
    }
    const probe = await EvalBackendProbe.probe(config.baseUrl ?? "", config.apiKey ?? "", config.model ?? "");
    return {
      ...config,
      available: probe.available
    };
  }

  private static coerceMetrics(payload: JsonObject): Record<string, MetricScore> {
    const result: Record<string, MetricScore> = {};
    for (const key of [
      "忠实度",
      "答案相关性",
      "上下文精度",
      "上下文召回率",
      "上下文相关性",
      "幻觉检测",
      "偏见检测",
      "毒性检测",
      "隐私泄露检测",
      "相关性",
      "连贯性",
      "完整性"
    ]) {
      const value = payload[key];
      if (value && typeof value === "object") {
        const entry = value as JsonObject;
        result[key] = {
          score: this.coerceNumber(entry.score ?? 0),
          reason: String(entry.reason ?? ""),
          success: Boolean(entry.success),
          threshold: this.coerceNumber(entry.threshold ?? 0.8)
        };
      }
    }
    return result;
  }

  private static coerceNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
  }

  static fromEvalConfig(config: EvalConfigValues): EvalDeepEvalConfig {
    return {
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl
    };
  }
}
