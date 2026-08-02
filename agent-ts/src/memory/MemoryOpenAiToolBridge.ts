import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryApiClient } from "./api/MemoryApiClient.js";
import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "../openai/chat/OpenAIChatTool.js";
import { MemoryOpenAiToolBridgeComponents } from "./MemoryOpenAiToolBridgeComponents.js";
import { MemoryOpenAiToolBridgeComponentsFactory } from "./MemoryOpenAiToolBridgeComponentsFactory.js";
import { OpenAiToolResultFactory } from "../openai/tools/runtime/OpenAiToolResultFactory.js";

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
