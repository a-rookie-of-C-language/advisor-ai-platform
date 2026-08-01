import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../mcp/McpOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";
import { OpenAiToolCatalogAggregator } from "./OpenAiToolCatalogAggregator.js";
import { OpenAiToolExecutorRouter } from "./OpenAiToolExecutorRouter.js";

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
