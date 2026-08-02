import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/json/JsonTypes.js";
import type { WorkspaceManager } from "../core/WorkspaceManager.js";
import { WorkspaceOpenAiMutationToolExecutor } from "./WorkspaceOpenAiMutationToolExecutor.js";
import { WorkspaceOpenAiToolDispatcher } from "./WorkspaceOpenAiToolDispatcher.js";
import { WorkspaceOpenAiReadToolExecutor } from "./read/WorkspaceOpenAiReadToolExecutor.js";

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
