import assert from "node:assert/strict";
import test from "node:test";
import { EvalDeepEval } from "../dist/evaluation/deepeval/EvalDeepEval.js";

test("eval deepeval returns error without external config", async () => {
  const result = await EvalDeepEval.evaluate("问题", "标准答案", "标准答案", ["标准答案", "上下文"]);
  assert.equal(result.error, "no_deepeval_provider");
  assert.equal(result.avg_score, 0);
  assert.equal(result.method, "deepeval");
});
