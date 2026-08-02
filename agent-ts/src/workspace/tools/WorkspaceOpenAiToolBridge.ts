import type { ChatStreamRequest } from "../../common/ChatStreamRequest.js";
import type { JsonObject } from "../../common/JsonTypes.js";
import type { OpenAIChatTool } from "../../openai/chat/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/OpenAiToolExecutionResult.js";
import { OpenAiToolResultFactory } from "../../openai/tools/runtime/OpenAiToolResultFactory.js";
import type { WorkspaceManager } from "../core/WorkspaceManager.js";
import { WorkspaceOpenAiToolBridgeComponents } from "./WorkspaceOpenAiToolBridgeComponents.js";
import { WorkspaceOpenAiToolBridgeComponentsFactory } from "./WorkspaceOpenAiToolBridgeComponentsFactory.js";

export class WorkspaceOpenAiToolBridge {
  private readonly components: WorkspaceOpenAiToolBridgeComponents;
  private readonly componentsFactory = new WorkspaceOpenAiToolBridgeComponentsFactory();
  private readonly toolNames: Set<string>;

  constructor(workspaceManager: WorkspaceManager) {
    this.components = this.componentsFactory.create(workspaceManager);
    this.toolNames = this.components.catalog.toolNames();
  }

  listTools(): OpenAIChatTool[] {
    return this.components.catalog.listTools();
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
      const output = await this.components.executor.execute(request, toolName, args);
      return this.components.resultFactory.createSuccess(output);
    } catch (error) {
      return OpenAiToolResultFactory.errorFromUnknown(error, "workspace tool failed");
    }
  }
}
