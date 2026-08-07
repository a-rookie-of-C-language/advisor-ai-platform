import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { WorkspaceOpenAiMutationToolExecutor } from "../../mutation/WorkspaceOpenAiMutationToolExecutor.js";
import { WorkspaceOpenAiReadToolExecutor } from "../../read/core/WorkspaceOpenAiReadToolExecutor.js";
import { WorkspaceOpenAiToolDispatcher } from "./WorkspaceOpenAiToolDispatcher.js";

export class WorkspaceOpenAiToolExecutor {
  private readonly dispatcher: WorkspaceOpenAiToolDispatcher;

  constructor(workspaceManager: WorkspaceManager) {
    this.dispatcher = new WorkspaceOpenAiToolDispatcher(
      new WorkspaceOpenAiMutationToolExecutor(workspaceManager),
      new WorkspaceOpenAiReadToolExecutor(workspaceManager)
    );
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    return this.dispatcher.dispatch(request, toolName, args);
  }
}
