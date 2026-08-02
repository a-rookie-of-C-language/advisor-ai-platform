import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/json/JsonTypes.js";
import type { WorkspaceOpenAiMutationToolExecutor } from "./WorkspaceOpenAiMutationToolExecutor.js";
import type { WorkspaceOpenAiReadToolExecutor } from "./WorkspaceOpenAiReadToolExecutor.js";

export class WorkspaceOpenAiToolDispatcher {
  constructor(
    private readonly mutationToolExecutor: WorkspaceOpenAiMutationToolExecutor,
    private readonly readToolExecutor: WorkspaceOpenAiReadToolExecutor
  ) {}

  async dispatch(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    if (this.readToolExecutor.canExecute(toolName)) {
      return this.readToolExecutor.execute(request, toolName, args);
    }
    if (this.mutationToolExecutor.canExecute(toolName)) {
      return this.mutationToolExecutor.execute(request, toolName, args);
    }
    throw new Error(`未知 workspace 工具: ${toolName}`);
  }
}
