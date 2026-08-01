import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceFileReadOpenAiToolExecutor {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    return {
      content: await this.workspaceManager.read(
        request.userId ?? null,
        request.sessionId ?? null,
        OpenAiToolArgumentReader.readRequiredString(args, "path"),
        OpenAiToolArgumentReader.readOptionalNumber(args, "offset", 0),
        OpenAiToolArgumentReader.readOptionalNumber(args, "limit", 8192)
      )
    };
  }
}
