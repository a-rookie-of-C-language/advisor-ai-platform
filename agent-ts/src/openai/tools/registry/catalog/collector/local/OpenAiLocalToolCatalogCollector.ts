import type { MemoryOpenAiToolBridge } from "../../../../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../../../../rag/openAi/bridge/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../../../../web/openAi/core/bridge/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../../../../chat/model/tool/OpenAIChatTool.js";
import { createSwitchExecutionModeTool, createUpdateTodoTool } from "../../../tools/ToolDefinitionFactory.js";

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
    tools.push(createUpdateTodoTool(), createSwitchExecutionModeTool());
    return tools;
  }
}
