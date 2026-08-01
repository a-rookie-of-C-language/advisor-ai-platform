import type { ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { JsonObject } from "./common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "./openai/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./openai/OpenAIChatTool.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";
import { OpenAiToolResultFactory } from "./openai/OpenAiToolResultFactory.js";
import { WorkspaceOpenAiToolCatalog } from "./WorkspaceOpenAiToolCatalog.js";
import { WorkspaceOpenAiToolExecutor } from "./WorkspaceOpenAiToolExecutor.js";

export class WorkspaceOpenAiToolBridge {
  private readonly catalog = new WorkspaceOpenAiToolCatalog();
  private readonly executor: WorkspaceOpenAiToolExecutor;
  private readonly toolNames = this.catalog.toolNames();

  constructor(workspaceManager: WorkspaceManager) {
    this.executor = new WorkspaceOpenAiToolExecutor(workspaceManager);
  }

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools();
  }

  canExecute(toolName: string): boolean {
    return this.toolNames.has(toolName);
  }

  async executeTool(
    request: ChatStreamRequest,
    toolName: string,
    args: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    try {
      const output = await this.executor.execute(request, toolName, args);
      return { output: JSON.stringify({ ok: true, status: "ok", ...output }), success: true };
    } catch (error) {
      return OpenAiToolResultFactory.error(error instanceof Error ? error.message : "workspace tool failed");
    }
  }
}
