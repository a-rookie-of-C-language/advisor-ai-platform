import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiReadToolExecutor } from "./WorkspaceOpenAiReadToolExecutor.js";

export class WorkspaceOpenAiToolExecutor {
  private readonly readToolExecutor: WorkspaceOpenAiReadToolExecutor;

  constructor(private readonly workspaceManager: WorkspaceManager) {
    this.readToolExecutor = new WorkspaceOpenAiReadToolExecutor(workspaceManager);
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    const userId = request.userId ?? null;
    const sessionId = request.sessionId ?? null;
    if (this.readToolExecutor.canExecute(toolName)) {
      return this.readToolExecutor.execute(request, toolName, args);
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
