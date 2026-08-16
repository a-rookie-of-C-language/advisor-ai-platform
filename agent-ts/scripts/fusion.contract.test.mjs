import assert from "node:assert/strict";
import test from "node:test";
import { FusionPipeline } from "../dist/fusion/core/FusionPipeline.js";

test("fusion ranks RAG and official candidates ahead of web candidates", () => {
  const result = new FusionPipeline().fuse([
    { content: "网页内容", source: "web", score: 1, metadata: {} },
    { content: "官方制度", source: "rag", score: 1, metadata: { authority: "official" } }
  ], "policy");
  assert.equal(result.candidates[0].content, "官方制度");
  assert.match(new FusionPipeline().renderPrompt(result), /官方来源/);
});

test("fusion emits a conflict hint only when RAG and web disagree", () => {
  const result = new FusionPipeline().fuse([
    { content: "制度支持申请", source: "rag", score: 1, metadata: {} },
    { content: "网页说明不支持申请", source: "web", score: 1, metadata: {} }
  ]);
  assert.match(result.conflictHint, /存在分歧/);
  assert.equal(new FusionPipeline().fuse([{ content: "只有知识库", source: "rag", score: 1, metadata: {} }])?.conflictHint, undefined);
});
