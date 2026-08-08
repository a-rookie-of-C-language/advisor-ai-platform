import type { JsonObject } from "../../../../../common/json/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../../common/model/ChatStreamRequest.js";
import { OpenAiToolArgumentReader } from "../../../../../openai/tools/arguments/core/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "../../../../core/manager/WorkspaceManager.js";
import { WorkspaceRequestIdentityResolver } from "../../../../path/identity/WorkspaceRequestIdentityResolver.js";

export class WorkspaceWriteOpenAiToolExecutor {
  private readonly identityResolver = new WorkspaceRequestIdentityResolver();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    const identity = this.identityResolver.resolve(request);
    return {
      result: await this.workspaceManager.write(
        identity.userId,
        identity.sessionId,
        OpenAiToolArgumentReader.readRequiredString(args, "path"),
        OpenAiToolArgumentReader.readRequiredString(args, "content"),
        OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
      )
    };
  }
}
