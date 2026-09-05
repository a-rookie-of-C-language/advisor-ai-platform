import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { EvalCase } from "../model/EvalCase.js";
import type { EvalDataset } from "../model/EvalDataset.js";
import { EvalReportBuilder } from "../report/EvalReportBuilder.js";
import { toJsonable } from "../serialization/toJsonable.js";

export class EvalRunner {
  constructor(
    private readonly dataset: EvalDataset,
    private readonly topK = 5
  ) {}

  async runAll(): Promise<JsonObject> {
    const report = EvalReportBuilder.create(this.dataset.name, { kb_id: this.dataset.kbId, top_k: this.topK });
    for (const evalCase of this.dataset.cases) {
      const caseResult: JsonObject = {
        id: evalCase.id,
        query: evalCase.query,
        tags: [...evalCase.tags]
      };
      caseResult.retrieval = this.evalRetrieval(evalCase);
      if (evalCase.expectedAnnotation) {
        caseResult.annotation = this.evalAnnotation(evalCase);
      }
      caseResult.fusion = this.evalFusion(evalCase);
      if (evalCase.expectedAnswer) {
        caseResult.e2e = this.evalE2e(evalCase);
        caseResult.e2e_deepeval = this.evalE2eDeepEval(evalCase);
      }
      EvalReportBuilder.addCaseResult(report, caseResult);
    }
    EvalReportBuilder.computeSummary(report);
    return toJsonable(report) as unknown as JsonObject;
  }

  private evalRetrieval(_evalCase: EvalCase): JsonObject {
    return {
      [`recall@${this.topK}`]: 0,
      mrr: 0,
      [`ndcg@${this.topK}`]: 0,
      retrieved_count: 0,
      expected_count: 0
    };
  }

  private evalAnnotation(_evalCase: EvalCase): JsonObject {
    return {
      type_correct: false,
      authority_correct: false,
      effective_date_correct: false
    };
  }

  private evalFusion(_evalCase: EvalCase): JsonObject {
    return { improvement_rate: 0 };
  }

  private evalE2e(_evalCase: EvalCase): JsonObject {
    return {
      avg_score: 0,
      relevance: 0,
      completeness: 0,
      accuracy: 0,
      fluency: 0
    };
  }

  private evalE2eDeepEval(_evalCase: EvalCase): JsonObject {
    return {
      avg_score: 0,
      metrics: {}
    };
  }
}
