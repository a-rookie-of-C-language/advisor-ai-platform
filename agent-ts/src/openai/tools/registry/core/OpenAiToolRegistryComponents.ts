import type { MemoryOpenAiToolBridge } from "../../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../../rag/openAi/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../../web/openAi/core/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import { OpenAiToolCatalogAggregator } from "../catalog/OpenAiToolCatalogAggregator.js";
import { OpenAiToolExecutorRouter } from "../execution/OpenAiToolExecutorRouter.js";

export class OpenAiToolRegistryComponents {
  readonly toolCatalogAggregator: OpenAiToolCatalogAggregator;
  readonly toolExecutorRouter: OpenAiToolExecutorRouter;

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
}
