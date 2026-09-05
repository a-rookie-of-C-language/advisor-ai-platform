import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { EvalCase } from "../model/EvalCase.js";
import type { EvalDataset } from "../model/EvalDataset.js";
import { EvalJudge } from "../judge/EvalJudge.js";
import { EvalDeepEval } from "../deepeval/EvalDeepEval.js";
import { EvalReportBuilder } from "../report/EvalReportBuilder.js";
import { toJsonable } from "../serialization/toJsonable.js";

export interface EvalRetrievedChunk {
  readonly chunkId: string;
  readonly text?: string;
  readonly source?: string;
  readonly score?: number;
}

export interface EvalFusionCandidate {
  readonly content: string;
  readonly source?: string;
  readonly score?: number;
}

export interface EvalRunnerAdapters {
  readonly ragSearch?: (query: string, kbId: number, topK: number) => Promise<readonly EvalRetrievedChunk[]>;
  readonly annotate?: (query: string, retrievedChunks: readonly EvalRetrievedChunk[]) => Promise<JsonObject>;
  readonly compareFusion?: (
    query: string,
    kbId: number,
    topK: number
  ) => Promise<{ before: readonly EvalFusionCandidate[]; after: readonly EvalFusionCandidate[] }>;
  readonly getAgentAnswer?: (query: string, kbId: number) => Promise<string>;
  readonly judgeE2e?: (query: string, expectedAnswer: string, actualAnswer: string) => Promise<JsonObject>;
  readonly deepeval?: (
    query: string,
    expectedAnswer: string,
    actualAnswer: string,
    retrievalContext: readonly string[]
  ) => Promise<JsonObject>;
}

export class EvalRunner {
  constructor(
    private readonly dataset: EvalDataset,
    private readonly topK = 5,
    private readonly adapters: EvalRunnerAdapters = {}
  ) {}

  async runAll(): Promise<JsonObject> {
    const report = EvalReportBuilder.create(this.dataset.name, { kb_id: this.dataset.kbId, top_k: this.topK });
    for (const evalCase of this.dataset.cases) {
      const caseResult: JsonObject = {
        id: evalCase.id,
        query: evalCase.query,
        tags: [...evalCase.tags]
      };
      const retrievedChunks = await this.ragSearch(evalCase.query);
      caseResult.retrieval = this.evalRetrieval(evalCase, retrievedChunks);
      if (evalCase.expectedAnnotation) {
        caseResult.annotation = await this.evalAnnotation(evalCase, retrievedChunks);
      }
      caseResult.fusion = await this.evalFusion(evalCase);
      if (evalCase.expectedAnswer) {
        const actualAnswer = await this.getAgentAnswer(evalCase);
        caseResult.e2e = await this.evalE2e(evalCase, actualAnswer);
        caseResult.e2e_deepeval = await this.evalE2eDeepEval(evalCase, actualAnswer, retrievedChunks);
      }
      EvalReportBuilder.addCaseResult(report, caseResult);
    }
    EvalReportBuilder.computeSummary(report);
    return toJsonable(report) as unknown as JsonObject;
  }

  private evalRetrieval(evalCase: EvalCase, retrievedChunks: readonly EvalRetrievedChunk[]): JsonObject {
    const retrievedIds = retrievedChunks.map((chunk) => chunk.chunkId);
    const expected = [...evalCase.expectedChunks];
    return {
      [`recall@${this.topK}`]: this.recallAtK(retrievedIds, expected, this.topK),
      mrr: this.mrr(retrievedIds, expected),
      [`ndcg@${this.topK}`]: this.ndcg(retrievedIds, expected, this.topK),
      retrieved_count: retrievedIds.length,
      expected_count: expected.length
    };
  }

  private async evalAnnotation(evalCase: EvalCase, retrievedChunks: readonly EvalRetrievedChunk[]): Promise<JsonObject> {
    if (!this.adapters.annotate) {
      return this.annotationAccuracy({ type: "general", authority: "secondary", effective_date: "" }, evalCase.expectedAnnotation ?? {});
    }
    const predicted = await this.adapters.annotate(evalCase.query, retrievedChunks);
    return this.annotationAccuracy(predicted, evalCase.expectedAnnotation ?? {});
  }

  private async evalFusion(evalCase: EvalCase): Promise<JsonObject> {
    if (!this.adapters.compareFusion) {
      return this.fusionScoreComparison([], []);
    }
    const candidates = await this.adapters.compareFusion(evalCase.query, this.dataset.kbId, this.topK);
    return this.fusionScoreComparison(candidates.before, candidates.after);
  }

  private async evalE2e(evalCase: EvalCase, actualAnswer: string): Promise<JsonObject> {
    if (!this.adapters.judgeE2e) {
      return EvalJudge.judge(evalCase.query, evalCase.expectedAnswer ?? "", actualAnswer);
    }
    return this.adapters.judgeE2e(evalCase.query, evalCase.expectedAnswer ?? "", actualAnswer);
  }

  private async evalE2eDeepEval(
    evalCase: EvalCase,
    actualAnswer: string,
    retrievedChunks: readonly EvalRetrievedChunk[]
  ): Promise<JsonObject> {
    if (!this.adapters.deepeval) {
      return EvalDeepEval.evaluate(
        evalCase.query,
        evalCase.expectedAnswer ?? "",
        actualAnswer,
        retrievedChunks.map((chunk) => chunk.text ?? "").filter((text) => text.length > 0)
      );
    }
    return this.adapters.deepeval(
      evalCase.query,
      evalCase.expectedAnswer ?? "",
      actualAnswer,
      retrievedChunks.map((chunk) => chunk.text ?? "").filter((text) => text.length > 0)
    );
  }

  private async ragSearch(query: string): Promise<readonly EvalRetrievedChunk[]> {
    if (!this.adapters.ragSearch) {
      return [];
    }
    return this.adapters.ragSearch(query, this.dataset.kbId, this.topK);
  }

  private async getAgentAnswer(evalCase: EvalCase): Promise<string> {
    if (!this.adapters.getAgentAnswer) {
      return "";
    }
    return this.adapters.getAgentAnswer(evalCase.query, this.dataset.kbId);
  }

  private recallAtK(retrieved: readonly string[], expected: readonly string[], k: number): number {
    if (expected.length === 0) return 0;
    const retrievedSet = new Set(retrieved.slice(0, k));
    const expectedSet = new Set(expected);
    return [...expectedSet].filter((chunkId) => retrievedSet.has(chunkId)).length / expectedSet.size;
  }

  private mrr(retrieved: readonly string[], expected: readonly string[]): number {
    if (expected.length === 0) return 0;
    const expectedSet = new Set(expected);
    const index = retrieved.findIndex((chunkId) => expectedSet.has(chunkId));
    return index >= 0 ? 1 / (index + 1) : 0;
  }

  private ndcg(retrieved: readonly string[], expected: readonly string[], k: number): number {
    if (expected.length === 0) return 0;
    const expectedSet = new Set(expected);
    let dcg = 0;
    for (const [index, chunkId] of retrieved.slice(0, k).entries()) {
      if (expectedSet.has(chunkId)) {
        dcg += 1 / Math.log2(index + 2);
      }
    }
    const idealCount = Math.min(expectedSet.size, k);
    const idcg = Array.from({ length: idealCount }, (_value, index) => 1 / Math.log2(index + 2)).reduce(
      (sum, value) => sum + value,
      0
    );
    return idcg === 0 ? 0 : dcg / idcg;
  }

  private annotationAccuracy(predicted: JsonObject, expected: JsonObject): JsonObject {
    const result: JsonObject = {};
    for (const fieldName of ["type", "authority", "effective_date"]) {
      if (!(fieldName in expected)) continue;
      const predictedValue = fieldName === "effective_date"
        ? String(predicted[fieldName] ?? "").slice(0, 10)
        : predicted[fieldName];
      const expectedRawValue = expected[fieldName];
      const expectedValue = fieldName === "effective_date"
        ? String(expectedRawValue ?? "").slice(0, 10)
        : expectedRawValue;
      result[`${fieldName}_correct`] = predictedValue === expectedValue;
    }
    return result;
  }

  private fusionScoreComparison(
    candidatesBefore: readonly EvalFusionCandidate[],
    candidatesAfter: readonly EvalFusionCandidate[]
  ): JsonObject {
    const beforeTop = candidatesBefore.slice(0, this.topK);
    const afterTop = candidatesAfter.slice(0, this.topK);
    const beforeRanks = new Map(beforeTop.map((candidate, index) => [candidate.content, index]));
    const rankChanges = afterTop.flatMap((candidate, index) => {
      const oldRank = beforeRanks.get(candidate.content);
      if (oldRank === undefined) return [];
      return [{
        content: candidate.content.slice(0, 50),
        source: candidate.source ?? "",
        old_rank: oldRank + 1,
        new_rank: index + 1,
        rank_change: oldRank - index
      }];
    });
    const beforeSet = new Set(beforeTop.map((candidate) => candidate.content));
    const afterSet = new Set(afterTop.map((candidate) => candidate.content));
    return {
      top_k: this.topK,
      rank_changes: rankChanges,
      before_source_distribution: this.sourceDistribution(beforeTop),
      after_source_distribution: this.sourceDistribution(afterTop),
      new_entries_count: [...afterSet].filter((content) => !beforeSet.has(content)).length,
      dropped_count: [...beforeSet].filter((content) => !afterSet.has(content)).length,
      improvement_rate: rankChanges.filter((change) => change.rank_change > 0).length / Math.max(rankChanges.length, 1)
    };
  }

  private sourceDistribution(candidates: readonly EvalFusionCandidate[]): JsonObject {
    const distribution: Record<string, number> = {};
    for (const candidate of candidates) {
      const source = candidate.source ?? "";
      distribution[source] = (distribution[source] ?? 0) + 1;
    }
    return distribution;
  }
}
