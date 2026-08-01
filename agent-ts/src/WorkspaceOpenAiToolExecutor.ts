import type { ChatStreamRequest } from "./ChatStreamRequest.js";
import type { JsonObject } from "./JsonTypes.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceOpenAiToolExecutor {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
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
