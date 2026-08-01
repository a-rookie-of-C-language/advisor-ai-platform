import type { ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { JsonObject } from "./common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "./openai/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceOpenAiMutationToolExecutor {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  canExecute(toolName: string): boolean {
    return toolName === "workspace_write" || toolName === "workspace_edit" || toolName === "workspace_create_dir";
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    const userId = request.userId ?? null;
    const sessionId = request.sessionId ?? null;

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

    throw new Error(`未知 workspace 写操作工具: ${toolName}`);
  }
}
