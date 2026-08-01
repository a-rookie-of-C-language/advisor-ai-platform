import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceListOpenAiToolExecutor {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    const items = await this.workspaceManager.list(
      request.userId ?? null,
      request.sessionId ?? null,
      OpenAiToolArgumentReader.readOptionalString(args, "path", "."),
      OpenAiToolArgumentReader.readOptionalBoolean(args, "recursive", false)
    );
    return {
      items: items.map((item) => ({ ...item }))
    };
  }
}
