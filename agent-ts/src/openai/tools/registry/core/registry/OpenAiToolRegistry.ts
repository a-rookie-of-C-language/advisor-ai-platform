import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../../common/model/ChatStreamRequest.js";
import type { MemoryOpenAiToolBridge } from "../../../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../../../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../../../rag/openAi/bridge/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../../../web/openAi/core/bridge/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../../../chat/model/tool/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../../../runtime/model/OpenAiToolExecutionResult.js";
import { OpenAiToolRegistryComponents } from "../components/OpenAiToolRegistryComponents.js";

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
