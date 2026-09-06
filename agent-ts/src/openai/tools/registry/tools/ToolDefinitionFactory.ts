import type { OpenAIChatTool } from "../../../chat/model/tool/OpenAIChatTool.js";

export function createUpdateTodoTool(): OpenAIChatTool {
  return {
    type: "function",
    function: {
      name: "update_todo",
      description: "更新当前任务的 todo 列表和正在执行的索引，适合多步骤任务的执行控制。",
      parameters: {
        type: "object",
        properties: {
          todos: { type: "array", items: { type: "string" } },
          doingIdx: { type: "number" }
        },
        required: ["todos", "doingIdx"]
      }
    },
    meta: {
      category: "planning",
      readOnly: false,
      searchHint: "todo,计划,步骤,执行"
    }
  };
}

export function createSwitchExecutionModeTool(): OpenAIChatTool {
  return {
    type: "function",
    function: {
      name: "switch_execution_mode",
      description: "切换执行模式为 DIRECT 或 PLAN，用于任务复杂度变化时调整执行策略。",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["DIRECT", "PLAN"] },
          mode_reason: { type: "string" }
        },
        required: ["mode"]
      }
    },
    meta: {
      category: "planning",
      readOnly: false,
      searchHint: "模式,计划,direct,plan"
    }
  };
}
