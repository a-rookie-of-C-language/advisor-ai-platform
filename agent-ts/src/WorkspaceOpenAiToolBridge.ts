import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import { OpenAiToolResultFactory } from "./OpenAiToolResultFactory.js";
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
      return OpenAiToolResultFactory.error(error instanceof Error ? error.message : "workspace tool failed");
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
          OpenAiToolArgumentReader.readRequiredString(args, "path"),
          OpenAiToolArgumentReader.readOptionalNumber(args, "offset", 0),
          OpenAiToolArgumentReader.readOptionalNumber(args, "limit", 8192)
        )
      };
    }
    if (toolName === "workspace_write") {
      return {
        result: await this.workspaceManager.write(
          userId,
          sessionId,
          OpenAiToolArgumentReader.readRequiredString(args, "path"),
          OpenAiToolArgumentReader.readRequiredString(args, "content"),
          OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
        )
      };
    }
    if (toolName === "workspace_edit") {
      return {
        result: await this.workspaceManager.edit(
          userId,
          sessionId,
          OpenAiToolArgumentReader.readRequiredString(args, "path"),
          OpenAiToolArgumentReader.readRequiredString(args, "old_string"),
          OpenAiToolArgumentReader.readRequiredString(args, "new_string"),
          OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
        )
      };
    }
    if (toolName === "workspace_list") {
      const items = await this.workspaceManager.list(
        userId,
        sessionId,
        OpenAiToolArgumentReader.readOptionalString(args, "path", "."),
        OpenAiToolArgumentReader.readOptionalBoolean(args, "recursive", false)
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
          OpenAiToolArgumentReader.readRequiredString(args, "path"),
          OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
        )
      };
    }
    throw new Error(`未知 workspace 工具: ${toolName}`);
  }
}
