import assert from "node:assert/strict";
import test from "node:test";
import { createSwitchExecutionModeTool, createUpdateTodoTool } from "../dist/openai/tools/registry/tools/ToolDefinitionFactory.js";

test("planning tools are exposed with python-shaped schemas", () => {
  const updateTodo = createUpdateTodoTool();
  const switchExecutionMode = createSwitchExecutionModeTool();
  assert.equal(updateTodo.function.name, "update_todo");
  assert.deepEqual(updateTodo.function.parameters.required, ["todos", "doingIdx"]);
  assert.equal(switchExecutionMode.function.name, "switch_execution_mode");
  assert.deepEqual(switchExecutionMode.function.parameters.required, ["mode"]);
});
