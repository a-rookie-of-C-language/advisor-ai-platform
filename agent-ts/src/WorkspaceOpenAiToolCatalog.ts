import type { OpenAIChatTool } from "./openai/OpenAIChatTool.js";

export class WorkspaceOpenAiToolCatalog {
  listTools(): OpenAIChatTool[] {
    return [
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      }
    ];
  }

  toolNames(): Set<string> {
    return new Set(this.listTools().map((tool) => tool.function.name));
  }
}
