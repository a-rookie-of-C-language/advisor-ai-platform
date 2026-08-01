import type { OpenAIChatTool } from "../../openai/OpenAIChatTool.js";

export class WorkspaceReadOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "workspace_read",
        description: "读取当前会话 workspace 中的文本文件内容。",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "相对 workspace 的文件路径" },
            offset: { type: "integer", description: "读取起始字符位置，默认 0" },
            limit: { type: "integer", description: "最大读取字符数，默认 8192" }
          },
          required: ["path"]
        }
      }
    };
  }
}
