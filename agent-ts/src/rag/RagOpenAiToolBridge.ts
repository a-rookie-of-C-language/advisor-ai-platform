import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { OpenAiToolExecutionResult } from "../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "../openai/chat/OpenAIChatTool.js";
import type { RagApiClient } from "./api/RagApiClient.js";
import { OpenAiToolResultFactory } from "../openai/tools/runtime/OpenAiToolResultFactory.js";
import { RagOpenAiToolCatalog } from "./RagOpenAiToolCatalog.js";
import { RagOpenAiToolExecutor } from "./RagOpenAiToolExecutor.js";

export class RagOpenAiToolBridge {
  private readonly catalog = new RagOpenAiToolCatalog();
  private readonly executor: RagOpenAiToolExecutor;
  private readonly toolNames = this.catalog.toolNames();

  constructor(ragClient: RagApiClient) {
    this.executor = new RagOpenAiToolExecutor(ragClient);
  }

  listTools(): OpenAIChatTool[] {
    return this.catalog.listTools();
  }

  canExecute(toolName: string): boolean {
    return this.toolNames.has(toolName);
  }

  async executeTool(request: ChatStreamRequest, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    try {
      return await this.executor.execute(request, args);
    } catch (error) {
      return OpenAiToolResultFactory.errorFromUnknown(error, "rag_search failed");
    }
  }
}
