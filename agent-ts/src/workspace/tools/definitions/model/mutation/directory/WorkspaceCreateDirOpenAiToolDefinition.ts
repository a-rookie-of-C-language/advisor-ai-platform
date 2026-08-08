import type { OpenAIChatTool } from "../../../../../../openai/chat/model/tool/OpenAIChatTool.js";

export class WorkspaceCreateDirOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "workspace_create_dir",
        description: "在当前会话 workspace 中创建目录。",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "相对 workspace 的目录路径" },
            is_final: { type: "boolean", description: "是否在 final 目录下创建" }
          },
          required: ["path"]
        }
      }
    };
  }
}
