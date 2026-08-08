import type { JsonObject } from "../../../../../common/json/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../../common/model/ChatStreamRequest.js";
import { OpenAiToolArgumentReader } from "../../../../../openai/tools/arguments/core/reader/OpenAiToolArgumentReader.js";
import type { WorkspaceManager } from "../../../../core/manager/WorkspaceManager.js";
import { WorkspaceRequestIdentityResolver } from "../../../../path/identity/WorkspaceRequestIdentityResolver.js";

export class WorkspaceListOpenAiToolExecutor {
  private readonly identityResolver = new WorkspaceRequestIdentityResolver();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async execute(request: ChatStreamRequest, args: JsonObject): Promise<JsonObject> {
    const identity = this.identityResolver.resolve(request);
    const items = await this.workspaceManager.list(
      identity.userId,
      identity.sessionId,
      OpenAiToolArgumentReader.readOptionalString(args, "path", "."),
      OpenAiToolArgumentReader.readOptionalBoolean(args, "recursive", false)
    );
    return {
      items: items.map((item) => ({ ...item }))
    };
  }
}
