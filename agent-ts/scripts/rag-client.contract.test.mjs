import assert from "node:assert/strict";
import test from "node:test";
import { RagDocumentRanker } from "../dist/rag/context/ranking/RagDocumentRanker.js";
import { RagReadyDocumentSelector } from "../dist/rag/context/selection/RagReadyDocumentSelector.js";

test("rag document ranking keeps ready documents only and sorts by query keywords", () => {
  const selector = new RagReadyDocumentSelector();
  const ranker = new RagDocumentRanker();
  const documents = selector.select([
    { id: 1, fileName: "zeta guide", status: "READY" },
    { id: 2, fileName: "alpha guide", status: "INDEXED" },
    { id: 3, fileName: "draft guide", status: "PROCESSING" }
  ]);

  const results = ranker.rank(documents, "alpha");
  assert.deepEqual(results.map((document) => document.id), [2, 1]);
});
