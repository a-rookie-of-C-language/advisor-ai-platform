import assert from "node:assert/strict";
import test from "node:test";
import { ToolExplorer } from "../dist/tools/explorer/core/ToolExplorer.js";

test("tool explorer prefers read-only tools and search hints", () => {
  const explorer = new ToolExplorer();
  const result = explorer.explore(
    "查网页最新信息",
    [
      {
        type: "function",
        function: { name: "web_search", description: "search", parameters: {} },
        meta: { readOnly: true, searchHint: "网页,最新" }
      },
      {
        type: "function",
        function: { name: "memory_write", description: "write", parameters: {} },
        meta: { readOnly: false, searchHint: "记住" }
      }
    ],
    new Set(["search"])
  );

  assert.deepEqual(result.matchedTools, ["web_search"]);
  assert.equal(result.reason, "route_match");
  assert.equal(result.sufficient, true);
});
