import type { ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { JsonObject } from "./common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "./OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceOpenAiReadToolExecutor {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  canExecute(toolName: string): boolean {
    return toolName === "workspace_read" || toolName === "workspace_list";
  }

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

    throw new Error(`未知 workspace 读取工具: ${toolName}`);
  }
}
