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

test("tool explorer stops on planned final step", () => {
  const explorer = new ToolExplorer();
  const result = explorer.explore(
    "普通问题",
    [
      {
        type: "function",
        function: { name: "web_search", description: "search", parameters: {} },
        meta: { readOnly: true, searchHint: "网页,最新" }
      }
    ],
    new Set(["search"]),
    {
      steps: [
        {
          action: "final",
          reason: "done",
          sufficient: true,
          summary: "已经足够"
        }
      ]
    }
  );

  assert.deepEqual(result.matchedTools, []);
  assert.equal(result.reason, "none");
  assert.equal(result.sufficient, false);
});

test("tool explorer follows contextual student follow-up", () => {
  const explorer = new ToolExplorer();
  const result = explorer.explore(
    "具体是哪些",
    [
      {
        type: "function",
        function: { name: "list_students", description: "list students", parameters: {} },
        meta: { readOnly: true, searchHint: "学生名单" }
      }
    ],
    new Set(),
    undefined,
    [],
    [{ role: "user", content: "上一轮提到了学生" }]
  );

  assert.deepEqual(result.matchedTools, ["list_students"]);
  assert.equal(result.reason, "text_match");
  assert.equal(result.sufficient, true);
});
