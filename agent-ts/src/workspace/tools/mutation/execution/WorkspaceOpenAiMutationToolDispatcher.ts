import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { WorkspaceCreateDirOpenAiToolExecutor } from "../operation/directory/WorkspaceCreateDirOpenAiToolExecutor.js";
import type { WorkspaceEditOpenAiToolExecutor } from "../operation/file/WorkspaceEditOpenAiToolExecutor.js";
import type { WorkspaceWriteOpenAiToolExecutor } from "../operation/file/WorkspaceWriteOpenAiToolExecutor.js";

export class WorkspaceOpenAiMutationToolDispatcher {
  constructor(
    private readonly createDirToolExecutor: WorkspaceCreateDirOpenAiToolExecutor,
    private readonly editToolExecutor: WorkspaceEditOpenAiToolExecutor,
    private readonly writeToolExecutor: WorkspaceWriteOpenAiToolExecutor
  ) {}

  async dispatch(request: ChatStreamRequest, toolName: string, args: JsonObject): Promise<JsonObject> {
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
