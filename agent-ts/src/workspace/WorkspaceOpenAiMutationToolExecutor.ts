import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import { WorkspaceCreateDirOpenAiToolExecutor } from "./WorkspaceCreateDirOpenAiToolExecutor.js";
import { WorkspaceEditOpenAiToolExecutor } from "./WorkspaceEditOpenAiToolExecutor.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceMutationToolNameMatcher } from "./WorkspaceMutationToolNameMatcher.js";
import { WorkspaceWriteOpenAiToolExecutor } from "./WorkspaceWriteOpenAiToolExecutor.js";

export class WorkspaceOpenAiMutationToolExecutor {
  private readonly createDirToolExecutor: WorkspaceCreateDirOpenAiToolExecutor;
  private readonly editToolExecutor: WorkspaceEditOpenAiToolExecutor;
  private readonly toolNameMatcher = new WorkspaceMutationToolNameMatcher();
  private readonly writeToolExecutor: WorkspaceWriteOpenAiToolExecutor;

  constructor(workspaceManager: WorkspaceManager) {
    this.createDirToolExecutor = new WorkspaceCreateDirOpenAiToolExecutor(workspaceManager);
    this.editToolExecutor = new WorkspaceEditOpenAiToolExecutor(workspaceManager);
    this.writeToolExecutor = new WorkspaceWriteOpenAiToolExecutor(workspaceManager);
  }

  canExecute(toolName: string): boolean {
    return this.toolNameMatcher.matches(toolName);
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    if (toolName === "workspace_write") {
      return this.writeToolExecutor.execute(request, args);
    }

    if (toolName === "workspace_edit") {
      return this.editToolExecutor.execute(request, args);
    }

    if (toolName === "workspace_create_dir") {
      return this.createDirToolExecutor.execute(request, args);
    }

    throw new Error(`未知 workspace 写操作工具: ${toolName}`);
  }
}
