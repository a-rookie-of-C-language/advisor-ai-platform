import type { ChatStreamRequest } from "../../../common/model/ChatStreamRequest.js";
import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import { OpenAiToolResultFactory } from "../../../openai/tools/runtime/factory/OpenAiToolResultFactory.js";
import type { RagApiClient } from "../../api/core/RagApiClient.js";
import { RagOpenAiToolCatalog } from "../catalog/RagOpenAiToolCatalog.js";
import { RagOpenAiToolExecutor } from "../execution/RagOpenAiToolExecutor.js";

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
