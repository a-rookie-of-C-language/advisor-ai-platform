import assert from "node:assert/strict";
import test from "node:test";
import { ToolExplorer } from "../dist/tools/explorer/core/ToolExplorer.js";
import { buildExplorerContext } from "../dist/graph/helpers.js";

test("tool explorer exposes explorer context payload", () => {
  const explorer = new ToolExplorer();
  const result = explorer.explore(
    "找一下 web_search 的说明",
    [
      { type: "function", function: { name: "web_search", description: "Search the web", parameters: {} } }
    ],
    new Set(["search"])
  );

  assert.equal(result.reason, "route_match");
  assert.equal(result.matchedTools[0], "web_search");
  assert.equal(result.summary.length > 0, true);
  assert.equal(result.evidence.length > 0, true);
  assert.equal(result.toolCalls.length > 0, true);

  const context = buildExplorerContext(result);
  assert.match(context, /read-only tool explorer/);
  assert.match(context, /tool_calls/);
  assert.match(context, /web_search/);
});
