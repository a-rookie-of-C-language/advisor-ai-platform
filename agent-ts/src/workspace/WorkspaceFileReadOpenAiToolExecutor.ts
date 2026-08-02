import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { OpenAiToolArgumentReader } from "../openai/tools/arguments/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceRequestIdentityResolver } from "./path/WorkspaceRequestIdentityResolver.js";

export class WorkspaceFileReadOpenAiToolExecutor {
  private readonly identityResolver = new WorkspaceRequestIdentityResolver();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    const identity = this.identityResolver.resolve(request);
    return {
      content: await this.workspaceManager.read(
        identity.userId,
        identity.sessionId,
        OpenAiToolArgumentReader.readRequiredString(args, "path"),
        OpenAiToolArgumentReader.readOptionalNumber(args, "offset", 0),
        OpenAiToolArgumentReader.readOptionalNumber(args, "limit", 8192)
      )
    };
  }
}
