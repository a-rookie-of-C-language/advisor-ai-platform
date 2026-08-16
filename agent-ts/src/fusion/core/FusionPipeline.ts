import type { FusionResult } from "../model/FusionResult.js";
import type { SourceCandidate } from "../model/SourceCandidate.js";

export interface FusionPipelineOptions {
  readonly sourceWeights?: Partial<Record<SourceCandidate["source"], number>>;
}

export class FusionPipeline {
  private readonly weights: Record<SourceCandidate["source"], number>;

  constructor(options: FusionPipelineOptions = {}) {
    this.weights = {
      rag: options.sourceWeights?.rag ?? 1,
      web: options.sourceWeights?.web ?? 0.7,
      user_context: options.sourceWeights?.user_context ?? 0.5
    };
  }

  fuse(candidates: readonly SourceCandidate[], scene = "general"): FusionResult | undefined {
    if (candidates.length === 0) return undefined;
    const conflictHint = this.detectConflict(candidates);
    const ranked = candidates
      .map((candidate) => ({
        ...candidate,
        score: candidate.score * this.weights[candidate.source] * (candidate.metadata.authority === "official" ? 1.2 : 1)
      }))
      .sort((left, right) => right.score - left.score);
    return { candidates: ranked, scene, conflictHint };
  }

  renderPrompt(result: FusionResult): string {
    const lines = ["以下是多源检索结果，供你参考："];
    const rag = result.candidates.filter((candidate) => candidate.source === "rag");
    const web = result.candidates.filter((candidate) => candidate.source === "web");
    if (rag.length > 0) {
      lines.push("", "【知识库检索结果】", ...rag.map((candidate) => this.renderCandidate(candidate)));
    }
    if (web.length > 0) {
      lines.push("", "【网络搜索结果】", ...web.map((candidate) => this.renderCandidate(candidate)));
    }
    if (result.conflictHint) lines.push("", result.conflictHint);
    return lines.join("\n");
  }

  private renderCandidate(candidate: SourceCandidate): string {
    let line = `- ${candidate.content}`;
    if (candidate.metadata.authority === "official") line += " [官方来源]";
    if (typeof candidate.metadata.effective_date === "string" && candidate.metadata.effective_date) {
      line += ` [日期: ${candidate.metadata.effective_date}]`;
    }
    return line;
  }

  private detectConflict(candidates: readonly SourceCandidate[]): string | undefined {
    const ragText = candidates.filter((candidate) => candidate.source === "rag").map((candidate) => candidate.content).join(" ");
    const webText = candidates.filter((candidate) => candidate.source === "web").map((candidate) => candidate.content).join(" ");
    if (!ragText || !webText) return undefined;
    const pairs = [["支持", "不支持"], ["允许", "不允许"], ["可以", "不可以"], ["需要", "不需要"], ["必须", "不必"]] as const;
    const conflict = pairs.find(([positive, negative]) =>
      (ragText.includes(positive) && !ragText.includes(negative) && webText.includes(negative)) ||
      (ragText.includes(negative) && webText.includes(positive) && !webText.includes(negative))
    );
    if (!conflict) return undefined;
    return `⚠️ 检测到知识库与网络信息关于「${conflict[0]}」存在分歧，请综合判断，优先以权威来源为准，并说明信息差异。`;
  }
}
