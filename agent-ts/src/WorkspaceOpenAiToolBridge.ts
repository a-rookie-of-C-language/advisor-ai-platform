import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject, JsonValue } from "./JsonTypes.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiToolCatalog } from "./WorkspaceOpenAiToolCatalog.js";

export class WorkspaceOpenAiToolBridge {
  private readonly catalog = new WorkspaceOpenAiToolCatalog();
  private readonly toolNames = this.catalog.toolNames();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools();
  }

  canExecute(toolName: string): boolean {
    return this.toolNames.has(toolName);
  }

  async executeTool(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
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
