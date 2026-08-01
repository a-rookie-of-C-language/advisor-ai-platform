import type { MemoryOpenAiToolBridge } from "../MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../McpOpenAiToolBridge.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagOpenAiToolBridge } from "../RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";

export class OpenAiToolCatalogAggregator {
  constructor(
    private readonly workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    private readonly webOpenAiToolBridge?: WebOpenAiToolBridge,
    private readonly ragOpenAiToolBridge?: RagOpenAiToolBridge,
    private readonly memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    private readonly mcpOpenAiToolBridge?: McpOpenAiToolBridge
  ) {}

  async listTools(): Promise<OpenAIChatTool[]> {
    const tools = this.workspaceOpenAiToolBridge?.listTools() || [];
    tools.push(...(this.webOpenAiToolBridge?.listTools() || []));
    tools.push(...(this.ragOpenAiToolBridge?.listTools() || []));
    tools.push(...(this.memoryOpenAiToolBridge?.listTools() || []));

    try {
      tools.push(...(this.mcpOpenAiToolBridge ? await this.mcpOpenAiToolBridge.listTools() : []));
    } catch {
      return tools;
    }

    return tools;
  }
}
