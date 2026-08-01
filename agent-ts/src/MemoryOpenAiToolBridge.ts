import type { ChatStreamRequest } from "./common/ChatStreamRequest.js";
import type { JsonObject } from "./common/JsonTypes.js";
import type { MemoryApiClient } from "./MemoryApiClient.js";
import type { OpenAiToolExecutionResult } from "./openai/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./openai/OpenAIChatTool.js";
import { MemoryOpenAiToolCatalog } from "./MemoryOpenAiToolCatalog.js";
import { MemoryOpenAiToolExecutor } from "./MemoryOpenAiToolExecutor.js";
import { OpenAiToolResultFactory } from "./openai/OpenAiToolResultFactory.js";

export class MemoryOpenAiToolBridge {
  private readonly catalog = new MemoryOpenAiToolCatalog();
  private readonly executor: MemoryOpenAiToolExecutor;
  private readonly toolNames = this.catalog.toolNames();

  constructor(
    memoryClient: MemoryApiClient,
    topK: number
  ) {
    this.executor = new MemoryOpenAiToolExecutor(memoryClient, topK);
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
      return await this.executor.execute(request, toolName, args);
    } catch (error) {
      return OpenAiToolResultFactory.error(error instanceof Error ? error.message : "memory tool failed");
    }
  }
}
