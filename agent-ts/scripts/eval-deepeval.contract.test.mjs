import assert from "node:assert/strict";
import test from "node:test";
import { EvalDeepEval } from "../dist/evaluation/deepeval/EvalDeepEval.js";

test("eval deepeval produces named metrics", () => {
  const result = EvalDeepEval.evaluate(
    "问题",
    "标准答案",
    "标准答案",
    ["标准答案", "上下文"]
  );
  assert.equal(result.method, "heuristic-deepeval");
  assert.ok(result.metrics.忠实度.score >= 0);
  assert.ok(result.metrics.完整性.score >= 0);
  assert.ok(result.avg_score >= 0);
});
