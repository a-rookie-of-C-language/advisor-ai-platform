import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class WorkspaceEditOpenAiToolExecutor {
  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    return {
      result: await this.workspaceManager.edit(
        request.userId ?? null,
        request.sessionId ?? null,
        OpenAiToolArgumentReader.readRequiredString(args, "path"),
        OpenAiToolArgumentReader.readRequiredString(args, "old_string"),
        OpenAiToolArgumentReader.readRequiredString(args, "new_string"),
        OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
      )
    };
  }
}
