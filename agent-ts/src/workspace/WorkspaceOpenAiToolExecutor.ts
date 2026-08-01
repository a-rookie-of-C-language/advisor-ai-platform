import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { WorkspaceOpenAiMutationToolExecutor } from "./WorkspaceOpenAiMutationToolExecutor.js";
import { WorkspaceOpenAiReadToolExecutor } from "./WorkspaceOpenAiReadToolExecutor.js";

export class WorkspaceOpenAiToolExecutor {
  private readonly mutationToolExecutor: WorkspaceOpenAiMutationToolExecutor;
  private readonly readToolExecutor: WorkspaceOpenAiReadToolExecutor;

  constructor(workspaceManager: WorkspaceManager) {
    this.mutationToolExecutor = new WorkspaceOpenAiMutationToolExecutor(workspaceManager);
    this.readToolExecutor = new WorkspaceOpenAiReadToolExecutor(workspaceManager);
  }

  async execute(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    if (this.readToolExecutor.canExecute(toolName)) {
      return this.readToolExecutor.execute(request, toolName, args);
    }
    if (this.mutationToolExecutor.canExecute(toolName)) {
      return this.mutationToolExecutor.execute(request, toolName, args);
    }
    throw new Error(`未知 workspace 工具: ${toolName}`);
  }
}
