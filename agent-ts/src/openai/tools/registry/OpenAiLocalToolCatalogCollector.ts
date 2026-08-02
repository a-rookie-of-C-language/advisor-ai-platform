import type { MemoryOpenAiToolBridge } from "../../../memory/tools/core/MemoryOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../rag/openAi/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../web/openAi/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../workspace/tools/core/WorkspaceOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../chat/model/OpenAIChatTool.js";

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
