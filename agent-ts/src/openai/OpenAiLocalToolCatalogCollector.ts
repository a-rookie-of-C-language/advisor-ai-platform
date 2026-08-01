import type { MemoryOpenAiToolBridge } from "../memory/MemoryOpenAiToolBridge.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";
import type { RagOpenAiToolBridge } from "../rag/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../web/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../workspace/WorkspaceOpenAiToolBridge.js";

export class OpenAiLocalToolCatalogCollector {
  constructor(
    private readonly workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    private readonly webOpenAiToolBridge?: WebOpenAiToolBridge,
    private readonly ragOpenAiToolBridge?: RagOpenAiToolBridge,
    private readonly memoryOpenAiToolBridge?: MemoryOpenAiToolBridge
  ) {}

  listTools(): OpenAIChatTool[] {
    const tools = this.workspaceOpenAiToolBridge?.listTools() || [];
    tools.push(...(this.webOpenAiToolBridge?.listTools() || []));
    tools.push(...(this.ragOpenAiToolBridge?.listTools() || []));
    tools.push(...(this.memoryOpenAiToolBridge?.listTools() || []));
    return tools;
  }
}
