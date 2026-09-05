import assert from "node:assert/strict";
import test from "node:test";
import { EvalRunner } from "../dist/evaluation/runner/EvalRunner.js";

test("eval runner computes python-shaped metrics", async () => {
  const runner = new EvalRunner(
    {
      name: "demo",
      version: "1.0",
      kbId: 7,
      cases: [
        {
          id: "case-1",
          query: "问题",
          expectedChunks: ["chunk-1"],
          tags: ["rag"],
          expectedAnnotation: { type: "policy", authority: "official", effective_date: "2024-01-01" },
          expectedAnswer: "标准答案"
        }
      ]
    },
    2,
    {
      ragSearch: async () => [
        { chunkId: "chunk-1", text: "命中文本", source: "rag", score: 0.9 },
        { chunkId: "chunk-2", text: "次要文本", source: "rag", score: 0.5 }
      ],
      annotate: async () => ({ type: "policy", authority: "official", effective_date: "2024-01-01" }),
      compareFusion: async () => ({
        before: [
          { content: "a", source: "rag", score: 0.2 },
          { content: "b", source: "web", score: 0.1 }
        ],
        after: [
          { content: "b", source: "web", score: 0.4 },
          { content: "a", source: "rag", score: 0.3 }
        ]
      }),
      getAgentAnswer: async () => "标准答案",
      judgeE2e: async () => ({ relevance: 5, completeness: 4, accuracy: 5, fluency: 4, avg_score: 4.6 }),
      deepeval: async (_query, _expectedAnswer, _actualAnswer, retrievalContext) => ({
        avg_score: 0.9,
        metrics: {
          忠实度: { score: 0.8 },
          连贯性: { score: 0.75 }
        },
        retrievalContext
      })
    }
  );

  const report = await runner.runAll();
  assert.equal(report.summary.retrieval["recall@2"], 1);
  assert.equal(report.summary.retrieval["ndcg@2"], 1);
  assert.equal(report.summary.annotation.type_correct, 1);
  assert.equal(report.summary.fusion.improvement_rate, 0.5);
  assert.equal(report.summary.e2e.avg_score, 4.6);
  assert.equal(report.summary.deepeval.avg_score, 0.9);
  assert.equal(report.summary.deepeval.忠实度, 0.8);
});
