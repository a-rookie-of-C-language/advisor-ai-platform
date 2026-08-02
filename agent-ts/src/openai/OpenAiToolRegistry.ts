import type { ChatStreamRequest } from "../common/ChatStreamRequest.js";
import type { JsonObject } from "../common/JsonTypes.js";
import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../mcp/openAi/McpOpenAiToolBridge.js";
import type { OpenAiToolExecutionResult } from "./tools/runtime/OpenAiToolExecutionResult.js";
import { OpenAiToolRegistryComponents } from "./OpenAiToolRegistryComponents.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";

export class OpenAiToolRegistry {
  private readonly components: OpenAiToolRegistryComponents;

  constructor(
    workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    webOpenAiToolBridge?: WebOpenAiToolBridge,
    ragOpenAiToolBridge?: RagOpenAiToolBridge,
    memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {
    this.components = new OpenAiToolRegistryComponents(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge,
      mcpOpenAiToolBridge
    );
  }

  async listTools(): Promise<OpenAIChatTool[]> {
    return this.components.toolCatalogAggregator.listTools();
  }

  async executeTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.components.toolExecutorRouter.executeTool(chatRequest, toolName, toolArgs);
  }
}
