import type { McpOpenAiToolBridge } from "../../../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { MemoryOpenAiToolBridge } from "../../../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../../../rag/openAi/bridge/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../../../web/openAi/core/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../../../chat/model/tool/OpenAIChatTool.js";
import { OpenAiLocalToolCatalogCollector } from "../collector/local/OpenAiLocalToolCatalogCollector.js";
import { OpenAiMcpToolCatalogCollector } from "../collector/mcp/OpenAiMcpToolCatalogCollector.js";

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
