import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../mcp/McpOpenAiToolBridge.js";
import { OpenAiLocalToolCatalogCollector } from "./OpenAiLocalToolCatalogCollector.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";

export class OpenAiToolCatalogAggregator {
  private readonly localToolCatalogCollector: OpenAiLocalToolCatalogCollector;

  constructor(
    workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    webOpenAiToolBridge?: WebOpenAiToolBridge,
    ragOpenAiToolBridge?: RagOpenAiToolBridge,
    memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    private readonly mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {
    this.localToolCatalogCollector = new OpenAiLocalToolCatalogCollector(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge
    );
  }

  async listTools(): Promise<OpenAIChatTool[]> {
    const tools = this.localToolCatalogCollector.listTools();

    try {
      tools.push(...(this.mcpOpenAiToolBridge ? await this.mcpOpenAiToolBridge.listTools() : []));
    } catch {
      return tools;
    }

    return tools;
  }
}
