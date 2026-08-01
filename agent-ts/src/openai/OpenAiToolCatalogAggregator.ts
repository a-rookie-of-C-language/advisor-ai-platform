import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../mcp/McpOpenAiToolBridge.js";
import { OpenAiLocalToolCatalogCollector } from "./OpenAiLocalToolCatalogCollector.js";
import { OpenAiMcpToolCatalogCollector } from "./OpenAiMcpToolCatalogCollector.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";

export class OpenAiToolCatalogAggregator {
  private readonly localToolCatalogCollector: OpenAiLocalToolCatalogCollector;
  private readonly mcpToolCatalogCollector: OpenAiMcpToolCatalogCollector;

  constructor(
    workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    webOpenAiToolBridge?: WebOpenAiToolBridge,
    ragOpenAiToolBridge?: RagOpenAiToolBridge,
    memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {
    this.localToolCatalogCollector = new OpenAiLocalToolCatalogCollector(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge
    );
    this.mcpToolCatalogCollector = new OpenAiMcpToolCatalogCollector(mcpOpenAiToolBridge);
  }

  async listTools(): Promise<OpenAIChatTool[]> {
    const tools = this.localToolCatalogCollector.listTools();
    tools.push(...(await this.mcpToolCatalogCollector.listTools()));
    return tools;
  }
}
