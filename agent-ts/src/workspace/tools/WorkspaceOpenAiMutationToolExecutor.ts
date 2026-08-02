import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { WorkspaceManager } from "../core/WorkspaceManager.js";
import { WorkspaceCreateDirOpenAiToolExecutor } from "./WorkspaceCreateDirOpenAiToolExecutor.js";
import { WorkspaceEditOpenAiToolExecutor } from "./WorkspaceEditOpenAiToolExecutor.js";
import { WorkspaceMutationToolNameMatcher } from "./WorkspaceMutationToolNameMatcher.js";
import { WorkspaceOpenAiMutationToolDispatcher } from "./WorkspaceOpenAiMutationToolDispatcher.js";
import { WorkspaceWriteOpenAiToolExecutor } from "./WorkspaceWriteOpenAiToolExecutor.js";

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
