import assert from "node:assert/strict";
import test from "node:test";
import { EvalJudge } from "../dist/evaluation/judge/EvalJudge.js";

test("eval judge produces weighted scores", () => {
  const score = EvalJudge.judge("how to use system", "use the system carefully", "use the system carefully");
  assert.equal(score.avg_score, 3.65);
  assert.equal(score.accuracy, 5);
});
