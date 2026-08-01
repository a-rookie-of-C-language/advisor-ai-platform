import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject, JsonValue } from "./JsonTypes.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceOpenAiToolBridge {
  private readonly toolNames = new Set(["workspace_read", "workspace_write", "workspace_edit", "workspace_list", "workspace_create_dir"]);

  constructor(private readonly workspaceManager: WorkspaceManager) {}

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

  canExecute(toolName: string): boolean {
    return this.toolNames.has(toolName);
  }

  async executeTool(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<{ output: string; success: boolean }> {
    try {
      const output = await this.executeWorkspaceTool(request, toolName, args);
      return { output: JSON.stringify({ ok: true, status: "ok", ...output }), success: true };
    } catch (error) {
      return {
        output: JSON.stringify({
          ok: false,
          status: "error",
          message: error instanceof Error ? error.message : "workspace tool failed",
          items: []
        }),
        success: false
      };
    }
  }

  private async executeWorkspaceTool(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    const userId = request.userId ?? null;
    const sessionId = request.sessionId ?? null;
    if (toolName === "workspace_read") {
      return {
        content: await this.workspaceManager.read(
          userId,
          sessionId,
          this.readRequiredString(args, "path"),
          this.readOptionalNumber(args, "offset", 0),
          this.readOptionalNumber(args, "limit", 8192)
        )
      };
    }
    if (toolName === "workspace_write") {
      return {
        result: await this.workspaceManager.write(
          userId,
          sessionId,
          this.readRequiredString(args, "path"),
          this.readRequiredString(args, "content"),
          this.readOptionalBoolean(args, "is_final", false)
        )
      };
    }
    if (toolName === "workspace_edit") {
      return {
        result: await this.workspaceManager.edit(
          userId,
          sessionId,
          this.readRequiredString(args, "path"),
          this.readRequiredString(args, "old_string"),
          this.readRequiredString(args, "new_string"),
          this.readOptionalBoolean(args, "is_final", false)
        )
      };
    }
    if (toolName === "workspace_list") {
      const items = await this.workspaceManager.list(
        userId,
        sessionId,
        this.readOptionalString(args, "path", "."),
        this.readOptionalBoolean(args, "recursive", false)
      );
      return {
        items: items.map((item) => ({ ...item }))
      };
    }
    if (toolName === "workspace_create_dir") {
      return {
        result: await this.workspaceManager.createDir(
          userId,
          sessionId,
          this.readRequiredString(args, "path"),
          this.readOptionalBoolean(args, "is_final", false)
        )
      };
    }
    throw new Error(`未知 workspace 工具: ${toolName}`);
  }

  private readRequiredString(args: JsonObject, key: string): string {
    const value = this.readAliasedValue(args, key);
    if (typeof value !== "string" || !value) {
      throw new Error(`缺少必填字段: ${key}`);
    }
    return value;
  }

  private readOptionalString(args: JsonObject, key: string, fallback: string): string {
    const value = this.readAliasedValue(args, key);
    return typeof value === "string" && value ? value : fallback;
  }

  private readOptionalNumber(args: JsonObject, key: string, fallback: number): number {
    const value = this.readAliasedValue(args, key);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private readOptionalBoolean(args: JsonObject, key: string, fallback: boolean): boolean {
    const value = this.readAliasedValue(args, key);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string" && value) {
      return ["1", "true", "yes", "y"].includes(value.toLowerCase());
    }
    return fallback;
  }

  private readAliasedValue(args: JsonObject, snakeKey: string): JsonValue | undefined {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return args[snakeKey] ?? args[camelKey];
  }
}
