import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { WorkspaceFileReadOpenAiToolExecutor } from "./WorkspaceFileReadOpenAiToolExecutor.js";
import { WorkspaceListOpenAiToolExecutor } from "./WorkspaceListOpenAiToolExecutor.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiReadToolDispatcher } from "./WorkspaceOpenAiReadToolDispatcher.js";
import { WorkspaceReadToolNameMatcher } from "./WorkspaceReadToolNameMatcher.js";

export class WorkspaceOpenAiReadToolExecutor {
  private readonly dispatcher: WorkspaceOpenAiReadToolDispatcher;
  private readonly toolNameMatcher = new WorkspaceReadToolNameMatcher();

  constructor(workspaceManager: WorkspaceManager) {
    this.dispatcher = new WorkspaceOpenAiReadToolDispatcher(
      new WorkspaceFileReadOpenAiToolExecutor(workspaceManager),
      new WorkspaceListOpenAiToolExecutor(workspaceManager)
    );
  }

  canExecute(toolName: string): boolean {
    return this.toolNameMatcher.matches(toolName);
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    return this.dispatcher.dispatch(request, toolName, args);
  }
}
