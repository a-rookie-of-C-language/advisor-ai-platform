import assert from "node:assert/strict";
import test from "node:test";
import { EvalReportBuilder } from "../dist/evaluation/report/EvalReportBuilder.js";

test("eval report builder aggregates deepeval scores", () => {
  const report = EvalReportBuilder.create("demo", { kb_id: 1, top_k: 5 });
  EvalReportBuilder.addCaseResult(report, {
    retrieval: { "recall@5": 1, mrr: 0.5, "ndcg@5": 0.4 },
    annotation: { type_correct: true, authority_correct: false, effective_date_correct: true },
    fusion: { improvement_rate: 0.25 },
    e2e: { avg_score: 0.8, relevance: 0.7, completeness: 0.6, accuracy: 0.9, fluency: 1 },
    e2e_deepeval: { avg_score: 0.9 }
  });
  EvalReportBuilder.computeSummary(report);
  assert.equal(report.summary.deepeval.avg_score, 0.9);
  assert.equal(report.summary.retrieval["recall@5"], 1);
  assert.equal(report.summary.annotation.type_correct, 1);
});
