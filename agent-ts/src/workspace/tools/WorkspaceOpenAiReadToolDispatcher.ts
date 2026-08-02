import type { ChatStreamRequest } from "../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { WorkspaceFileReadOpenAiToolExecutor } from "./WorkspaceFileReadOpenAiToolExecutor.js";
import type { WorkspaceListOpenAiToolExecutor } from "./WorkspaceListOpenAiToolExecutor.js";

export class WorkspaceOpenAiReadToolDispatcher {
  constructor(
    private readonly fileReadToolExecutor: WorkspaceFileReadOpenAiToolExecutor,
    private readonly listToolExecutor: WorkspaceListOpenAiToolExecutor
  ) {}

  async dispatch(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
    if (toolName === "workspace_read") {
      return this.fileReadToolExecutor.execute(request, args);
    }

    if (toolName === "workspace_list") {
      return this.listToolExecutor.execute(request, args);
    }

    throw new Error(`未知 workspace 读取工具: ${toolName}`);
  }
}
