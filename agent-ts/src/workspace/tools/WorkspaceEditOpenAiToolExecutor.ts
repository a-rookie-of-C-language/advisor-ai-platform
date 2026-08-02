import type { ChatStreamRequest } from "../../common/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../../openai/tools/arguments/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "../core/WorkspaceManager.js";
import { WorkspaceRequestIdentityResolver } from "../path/WorkspaceRequestIdentityResolver.js";

export class WorkspaceEditOpenAiToolExecutor {
  private readonly identityResolver = new WorkspaceRequestIdentityResolver();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    const identity = this.identityResolver.resolve(request);
    return {
      result: await this.workspaceManager.edit(
        identity.userId,
        identity.sessionId,
        OpenAiToolArgumentReader.readRequiredString(args, "path"),
        OpenAiToolArgumentReader.readRequiredString(args, "old_string"),
        OpenAiToolArgumentReader.readRequiredString(args, "new_string"),
        OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
      )
    };
  }
}
