import assert from "node:assert/strict";
import test from "node:test";
import { TaskPlanner } from "../dist/planning/core/TaskPlanner.js";

const tool = (name) => ({ type: "function", function: { name, description: name, parameters: {} } });

test("task planner fallback creates a constrained retrieval plan", () => {
  const planner = new TaskPlanner();
  const plan = planner.plan({
    userQuery: "请查询学生规章",
    availableTools: [tool("web_search"), tool("rag_search")],
    routeContext: { categories: ["retrieval"] }
  });
  assert.equal(plan.mode, "plan_and_execute");
  assert.deepEqual(plan.requiredTools, ["rag_search"]);
  assert.equal(plan.steps[0].arguments.top_k, 5);
  assert.deepEqual(plan.routeContext.categories, ["retrieval"]);
});

test("task planner defaults to direct generation when no tool is applicable", () => {
  const plan = new TaskPlanner().plan({
    userQuery: "你好",
    availableTools: [tool("web_search")],
    routeContext: { categories: ["retrieval"] }
  });
  assert.equal(plan.mode, "direct");
  assert.deepEqual(plan.requiredTools, []);
});

test("task planner prioritizes required tools without dropping the rest", () => {
  const tools = [tool("web_search"), tool("rag_search"), tool("workspace_read")];
  const plan = new TaskPlanner().plan({
    userQuery: "查文档",
    availableTools: tools,
    routeContext: { categories: ["retrieval"] }
  });
  assert.deepEqual(new TaskPlanner().prioritizeTools(tools, plan).map((item) => item.function.name), [
    "rag_search", "web_search", "workspace_read"
  ]);
});

test("task planner async plan prefers llm json and falls back on invalid output", async () => {
  const planner = new TaskPlanner(
    { openAiApiKey: "key" },
    {
      streamChat: async function* () {
        yield "{\"mode\":\"direct\",\"goal\":\"已规划\",\"summary\":\"来自模型\",\"stop_when\":\"完成\",\"sufficient\":true,\"required_tools\":[],\"steps\":[{\"action\":\"final\",\"reason\":\"done\",\"sufficient\":true,\"summary\":\"完成\"}],\"route_context\":{}}";
      }
    }
  );
  const plan = await planner.planAsync({
    userQuery: "普通问题",
    availableTools: [tool("web_search")],
    routeContext: {}
  });
  assert.equal(plan.mode, "direct");
  assert.equal(plan.summary, "来自模型");
  assert.equal(plan.steps[0].action, "final");
});
