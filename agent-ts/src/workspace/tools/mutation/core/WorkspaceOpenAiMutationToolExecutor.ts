import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { WorkspaceCreateDirOpenAiToolExecutor } from "../execution/WorkspaceCreateDirOpenAiToolExecutor.js";
import { WorkspaceEditOpenAiToolExecutor } from "../execution/WorkspaceEditOpenAiToolExecutor.js";
import { WorkspaceOpenAiMutationToolDispatcher } from "../execution/WorkspaceOpenAiMutationToolDispatcher.js";
import { WorkspaceWriteOpenAiToolExecutor } from "../execution/WorkspaceWriteOpenAiToolExecutor.js";
import { WorkspaceMutationToolNameMatcher } from "../matching/WorkspaceMutationToolNameMatcher.js";

export class WorkspaceOpenAiMutationToolExecutor {
  private readonly dispatcher: WorkspaceOpenAiMutationToolDispatcher;
  private readonly toolNameMatcher = new WorkspaceMutationToolNameMatcher();

  constructor(workspaceManager: WorkspaceManager) {
    this.dispatcher = new WorkspaceOpenAiMutationToolDispatcher(
      new WorkspaceCreateDirOpenAiToolExecutor(workspaceManager),
      new WorkspaceEditOpenAiToolExecutor(workspaceManager),
      new WorkspaceWriteOpenAiToolExecutor(workspaceManager)
    );
  }

  canExecute(toolName: string): boolean {
    return this.toolNameMatcher.matches(toolName);
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    return this.dispatcher.dispatch(request, toolName, args);
  }
}
