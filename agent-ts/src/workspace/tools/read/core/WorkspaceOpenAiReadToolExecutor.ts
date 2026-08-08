import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { WorkspaceOpenAiReadToolDispatcher } from "../execution/WorkspaceOpenAiReadToolDispatcher.js";
import { WorkspaceReadToolNameMatcher } from "../matching/WorkspaceReadToolNameMatcher.js";
import { WorkspaceFileReadOpenAiToolExecutor } from "../operation/file/WorkspaceFileReadOpenAiToolExecutor.js";
import { WorkspaceListOpenAiToolExecutor } from "../operation/list/WorkspaceListOpenAiToolExecutor.js";

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
