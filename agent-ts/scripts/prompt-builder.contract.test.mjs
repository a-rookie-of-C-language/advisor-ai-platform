import assert from "node:assert/strict";
import test from "node:test";
import { PromptBuilder } from "../dist/prompt/PromptBuilder.js";

test("prompt builder mirrors python side prompt helpers", () => {
  assert.equal(
    PromptBuilder.buildFailureAvoidPrompt({ memory: { reasons: ["r1"], avoid_strategy: "stay concise" } }),
    [
      "你有一个与当前问题相似的历史失败模式。",
      "请避免重复同样的错误。",
      "失败原因: [\"r1\"]",
      "建议策略: stay concise"
    ].join("\n")
  );
  assert.match(PromptBuilder.buildSceneDetectionPrompt("今天政策"), /scene/);
  assert.match(PromptBuilder.buildIntentRoutingPrompt(["retrieval"], "查资料"), /retrieval/);
  assert.equal(PromptBuilder.buildConflictHintPrompt("hint"), "hint");
  const taskPlanPayload = PromptBuilder.buildTaskPlanPromptPayload(
    "查资料",
    [{ role: "user", content: "recent", attachments: null }],
    [{ type: "function", function: { name: "rag_search", description: "desc", parameters: {} } }],
    { categories: ["retrieval"] }
  );
  assert.equal(taskPlanPayload.user_query, "查资料");
  assert.equal(Array.isArray(taskPlanPayload.recent_messages), true);
  assert.match(PromptBuilder.renderTaskPlanPrompt({ mode: "direct", summary: "ok" }), /执行计划/);
  assert.match(PromptBuilder.buildE2EJudgePrompt("q", "e", "a"), /评估专家/);
  assert.match(PromptBuilder.buildDeepEvalPrompt("q", "e", "a", ["ctx"]), /严格返回 JSON/);
  assert.match(PromptBuilder.buildRouteReasoningPrompt(["retrieval", "search"], [], false), /知识库/);
  assert.match(PromptBuilder.buildPlanReasoningPrompt({ mode: "direct", summary: "ok" }), /ok/);
  assert.match(PromptBuilder.buildDelegateReasoningPrompt("task_planner_subagent"), /任务规划器/);
  assert.match(PromptBuilder.buildTaskPlannerSystemPrompt(), /任务规划器/);
  assert.match(PromptBuilder.buildTaskPlannerPrompt("q", [], [], { categories: [] }), /user_query/);
  assert.match(
    PromptBuilder.buildTaskPlannerPrompt("q", [], [{ type: "function", function: { name: "rag_search", description: "desc", parameters: {} } }], { categories: [] }),
    /available_tool_catalog/
  );
});

test("prompt builder assembles system prompts in python order", () => {
  const messages = PromptBuilder.assembleMessages(
    [{ role: "user", content: "hello" }],
    {
      staticPrompts: ["static"],
      skillPrompts: ["skill"],
      dynamicPrompts: ["dynamic"]
    }
  );

  assert.deepEqual(messages.map((message) => message.role), ["system", "system", "system", "user"]);
  assert.deepEqual(messages.map((message) => message.content), ["static", "skill", "dynamic", "hello"]);
});
