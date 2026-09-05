import assert from "node:assert/strict";
import test from "node:test";
import { EvalJudge } from "../src/evaluation/judge/EvalJudge.ts";

test("eval judge returns error without external config", async () => {
  const score = await EvalJudge.judge("how to use system", "use the system carefully", "use the system carefully");
  assert.equal(score.error, "no_llm_provider");
  assert.equal(score.avg_score, 0);
});
