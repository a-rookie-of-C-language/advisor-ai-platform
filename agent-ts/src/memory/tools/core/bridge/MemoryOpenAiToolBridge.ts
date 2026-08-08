import type { JsonObject } from "../../../../common/json/types/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../common/model/ChatStreamRequest.js";
import type { OpenAIChatTool } from "../../../../openai/chat/model/tool/OpenAIChatTool.js";
import { OpenAiToolResultFactory } from "../../../../openai/tools/runtime/factory/OpenAiToolResultFactory.js";
import type { OpenAiToolExecutionResult } from "../../../../openai/tools/runtime/model/result/OpenAiToolExecutionResult.js";
import type { MemoryApiClient } from "../../../api/core/MemoryApiClient.js";
import { MemoryOpenAiToolBridgeComponentsFactory } from "../factory/bridge/MemoryOpenAiToolBridgeComponentsFactory.js";
import type { MemoryOpenAiToolBridgeComponents } from "../model/bridge/MemoryOpenAiToolBridgeComponents.js";

export class MemoryOpenAiToolBridge {
  private readonly components: MemoryOpenAiToolBridgeComponents;
  private readonly componentsFactory = new MemoryOpenAiToolBridgeComponentsFactory();
  private readonly toolNames: Set<string>;

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.components = this.componentsFactory.create(memoryClient, topK);
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
      return await this.components.executor.execute(request, toolName, args);
    } catch (error) {
      return OpenAiToolResultFactory.errorFromUnknown(error, "memory tool failed");
    }
  }
}
