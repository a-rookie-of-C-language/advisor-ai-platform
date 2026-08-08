import type { OpenAIChatTool } from "../../../../../../../openai/chat/model/tool/OpenAIChatTool.js";

export class WorkspaceEditOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "workspace_edit",
        description: "替换当前会话 workspace 文本文件中的一段内容。",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "相对 workspace 的文件路径" },
            old_string: { type: "string", description: "需要替换的原字符串" },
            new_string: { type: "string", description: "替换后的新字符串" },
            is_final: { type: "boolean", description: "是否将编辑结果写入 final 目录" }
          },
          required: ["path", "old_string", "new_string"]
        }
      }
    };
  }
}
