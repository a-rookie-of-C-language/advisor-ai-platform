import assert from "node:assert/strict";
import test from "node:test";
import { EvalDeepEval } from "../dist/evaluation/deepeval/EvalDeepEval.js";

test("eval deepeval reports unavailable when backend probe fails", async () => {
  const result = await EvalDeepEval.evaluate("q", "expected", "actual", [], {
    model: "",
    apiKey: "",
    baseUrl: ""
  });

  assert.equal(result.error, "no_deepeval_provider");
  assert.equal(result.avg_score, 0);
  assert.equal(result.method, "deepeval");
});
