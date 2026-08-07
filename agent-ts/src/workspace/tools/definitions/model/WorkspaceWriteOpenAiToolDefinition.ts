import type { OpenAIChatTool } from "../../../../openai/chat/model/OpenAIChatTool.js";

export class WorkspaceWriteOpenAiToolDefinition {
  create(): OpenAIChatTool {
    return {
      type: "function",
      function: {
        name: "workspace_write",
        description: "写入当前会话 workspace 中的文本文件。",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "相对 workspace 的文件路径" },
            content: { type: "string", description: "要写入的文本内容" },
            is_final: { type: "boolean", description: "是否写入 final 目录" }
          },
          required: ["path", "content"]
        }
      }
    };
  }
}
