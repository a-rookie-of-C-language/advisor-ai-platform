import assert from "node:assert/strict";
import test from "node:test";
import { IntentRouter } from "../dist/routing/core/IntentRouter.js";
import { buildLegacyRouteContext, preferRetrievalFallback } from "../dist/legacy/core/LegacyRouteSupport.js";
import { LegacyToolRouter } from "../dist/legacy/core/LegacyToolRouter.js";
import { TaskPlanner } from "../dist/planning/core/TaskPlanner.js";

const tool = (name) => ({ type: "function", function: { name, description: name, parameters: {} } });

test("legacy route support keeps retrieval preference when rag exists", () => {
  const decision = preferRetrievalFallback(
    new IntentRouter().route("帮我处理一下", ["retrieval", "search", "memory_read"]),
    true
  );
  assert.equal(decision.matchedBy, "fallback");
  assert.deepEqual([...decision.categories], ["retrieval"]);
});

test("intent router routes url queries to search", () => {
  const decision = new IntentRouter().route("https://example.com 看一下这个页面", ["retrieval", "search"]);
  assert.equal(decision.categories.has("search"), true);
  assert.equal(decision.matchedBy, "strong_rule");
  assert.equal(decision.fallbackReason, "url_detected_fetch");
});

test("legacy route context exposes the expected shape", () => {
  const decision = new IntentRouter().route("请根据知识库文档解释", ["retrieval", "search"]);
  const context = buildLegacyRouteContext(decision, ["rag_search"], true);
  assert.deepEqual(context.categories, ["retrieval"]);
  assert.deepEqual(context.matchedTools, ["rag_search"]);
  assert.equal(context.educationDomain, true);
  assert.deepEqual(context.preferredTools, ["rag_search"]);
});

test("legacy tool router delegates to legacy route context", () => {
  const decision = new IntentRouter().route("请根据知识库文档解释", ["retrieval", "search"]);
  const context = new LegacyToolRouter().route(decision, ["rag_search"], true);
  assert.deepEqual(context.categories, ["retrieval"]);
  assert.equal(context.matchedBy, "strong_rule");
});

test("preferred tools push the planner toward rag search", () => {
  const plan = new TaskPlanner().plan({
    userQuery: "普通问题",
    availableTools: [tool("rag_search"), tool("web_search")],
    routeCategories: ["retrieval"],
    preferredTools: ["rag_search"]
  });
  assert.equal(plan.mode, "plan_and_execute");
  assert.deepEqual(plan.requiredTools, ["rag_search"]);
});

test("legacy reasoning keeps explorer delegation when tools are matched", () => {
  const route = new IntentRouter().route("请根据知识库文档解释", ["retrieval", "search"]);
  const payload = buildLegacyRouteContext(route, ["rag_search"], true);
  assert.deepEqual(payload.preferredTools, ["rag_search"]);
});
