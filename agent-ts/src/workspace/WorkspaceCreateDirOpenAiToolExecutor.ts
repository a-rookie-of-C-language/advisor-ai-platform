import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceRequestIdentityResolver } from "./WorkspaceRequestIdentityResolver.js";

export class WorkspaceCreateDirOpenAiToolExecutor {
  private readonly identityResolver = new WorkspaceRequestIdentityResolver();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    const identity = this.identityResolver.resolve(request);
    return {
      result: await this.workspaceManager.createDir(
        identity.userId,
        identity.sessionId,
        OpenAiToolArgumentReader.readRequiredString(args, "path"),
        OpenAiToolArgumentReader.readOptionalBoolean(args, "is_final", false)
      )
    };
  }
}
