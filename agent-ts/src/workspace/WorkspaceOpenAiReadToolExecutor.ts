import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { WorkspaceFileReadOpenAiToolExecutor } from "./WorkspaceFileReadOpenAiToolExecutor.js";
import { WorkspaceListOpenAiToolExecutor } from "./WorkspaceListOpenAiToolExecutor.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceReadToolNameMatcher } from "./WorkspaceReadToolNameMatcher.js";

export class WorkspaceOpenAiReadToolExecutor {
  private readonly fileReadToolExecutor: WorkspaceFileReadOpenAiToolExecutor;
  private readonly listToolExecutor: WorkspaceListOpenAiToolExecutor;
  private readonly toolNameMatcher = new WorkspaceReadToolNameMatcher();

  constructor(workspaceManager: WorkspaceManager) {
    this.fileReadToolExecutor = new WorkspaceFileReadOpenAiToolExecutor(workspaceManager);
    this.listToolExecutor = new WorkspaceListOpenAiToolExecutor(workspaceManager);
  }

  canExecute(toolName: string): boolean {
    return this.toolNameMatcher.matches(toolName);
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    if (toolName === "workspace_read") {
      return this.fileReadToolExecutor.execute(request, args);
    }

    if (toolName === "workspace_list") {
      return this.listToolExecutor.execute(request, args);
    }

    throw new Error(`未知 workspace 读取工具: ${toolName}`);
  }
}
