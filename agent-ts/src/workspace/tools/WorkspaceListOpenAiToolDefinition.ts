import type { OpenAIChatTool } from "../../openai/chat/OpenAIChatTool.js";

export class WorkspaceListOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "workspace_list",
        description: "列出当前会话 workspace 目录内容。",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "相对 workspace 的目录路径，默认 ." },
            recursive: { type: "boolean", description: "是否递归列出子目录" }
          }
        }
      }
    };
  }
}
