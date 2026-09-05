import assert from "node:assert/strict";
import test from "node:test";
import { EvalDeepEval } from "../dist/evaluation/deepeval/EvalDeepEval.js";

test("eval deepeval falls back to heuristic without external config", async () => {
  const result = await EvalDeepEval.evaluate("问题", "标准答案", "标准答案", ["标准答案"]);
  assert.equal(result.method, "heuristic-deepeval");
  assert.ok(result.metrics.忠实度.score >= 0);
});
