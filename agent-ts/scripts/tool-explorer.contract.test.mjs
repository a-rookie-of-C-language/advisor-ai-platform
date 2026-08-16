import assert from "node:assert/strict";
import test from "node:test";
import { ToolExplorer } from "../dist/tools/explorer/core/ToolExplorer.js";

const tool = (name, description = name) => ({
  type: "function", function: { name, description, parameters: {} }
});

test("tool explorer maps route categories to matching tools", () => {
  const result = new ToolExplorer().explore(
    "查询文档",
    [tool("web_search"), tool("rag_search"), tool("workspace_read")],
    new Set(["retrieval"])
  );
  assert.deepEqual(result.matchedTools, ["rag_search"]);
  assert.equal(result.reason, "route_match");
});

test("tool explorer returns no speculative tool when nothing matches", () => {
  const result = new ToolExplorer().explore("你好", [tool("workspace_read", "读取工作区")], new Set());
  assert.deepEqual(result.matchedTools, []);
  assert.equal(result.reason, "none");
});
