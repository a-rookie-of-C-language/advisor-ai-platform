import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryOpenAiToolBridge } from "../MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../McpOpenAiToolBridge.js";
import { OpenAiToolCatalogAggregator } from "./OpenAiToolCatalogAggregator.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import { OpenAiToolExecutorRouter } from "./OpenAiToolExecutorRouter.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagOpenAiToolBridge } from "../RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";

export class OpenAiToolRegistry {
  private readonly toolCatalogAggregator: OpenAiToolCatalogAggregator;
  private readonly toolExecutorRouter: OpenAiToolExecutorRouter;

  constructor(
    workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    webOpenAiToolBridge?: WebOpenAiToolBridge,
    ragOpenAiToolBridge?: RagOpenAiToolBridge,
    memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {
    this.toolCatalogAggregator = new OpenAiToolCatalogAggregator(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge,
      mcpOpenAiToolBridge
    );
    this.toolExecutorRouter = new OpenAiToolExecutorRouter(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge,
      mcpOpenAiToolBridge
    );
  }

  async listTools(): Promise<OpenAIChatTool[]> {
    return this.toolCatalogAggregator.listTools();
  }

  async executeTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.toolExecutorRouter.executeTool(chatRequest, toolName, toolArgs);
  }
}
