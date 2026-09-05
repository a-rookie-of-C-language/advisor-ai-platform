import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { EvalDatasetLoader } from "../dist/evaluation/dataset/EvalDatasetLoader.js";

test("eval dataset loader reads python-shaped json", async () => {
  const directory = mkdtempSync(join(tmpdir(), "agent-eval-dataset-"));
  try {
    const file = join(directory, "dataset.json");
    writeFileSync(
      file,
      JSON.stringify({
        name: "demo",
        version: "1.0",
        kb_id: 12,
        cases: [
          {
            id: "case-1",
            query: "查询学生规章",
            tags: ["rag"],
            expected_chunks: ["chunk-1"],
            expected_annotation: { type: "policy" },
            expected_answer: "答案"
          }
        ]
      }),
      "utf8"
    );
    const dataset = await EvalDatasetLoader.load(file);
    assert.equal(dataset.name, "demo");
    assert.equal(dataset.version, "1.0");
    assert.equal(dataset.kbId, 12);
    assert.deepEqual(dataset.cases[0].expectedChunks, ["chunk-1"]);
    assert.equal(dataset.cases[0].expectedAnswer, "答案");
    assert.equal(dataset.cases[0].expectedAnnotation.type, "policy");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
