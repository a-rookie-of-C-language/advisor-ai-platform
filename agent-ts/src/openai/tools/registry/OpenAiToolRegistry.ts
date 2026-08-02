import type { ChatStreamRequest } from "../../../common/ChatStreamRequest.js";
import type { JsonObject } from "../../../common/JsonTypes.js";
import type { MemoryOpenAiToolBridge } from "../../../memory/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../../../mcp/openAi/McpOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../rag/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../web/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../workspace/WorkspaceOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../chat/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../runtime/OpenAiToolExecutionResult.js";
import { OpenAiToolRegistryComponents } from "./OpenAiToolRegistryComponents.js";

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
