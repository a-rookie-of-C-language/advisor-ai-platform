import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";
import type { ChatStreamRequest } from "../../../../../common/model/ChatStreamRequest.js";
import type { MemoryOpenAiToolBridge } from "../../../../../memory/tools/core/bridge/MemoryOpenAiToolBridge.js";
import type { McpOpenAiToolBridge } from "../../../../../mcp/openAi/core/McpOpenAiToolBridge.js";
import type { RagOpenAiToolBridge } from "../../../../../rag/openAi/bridge/RagOpenAiToolBridge.js";
import type { WebOpenAiToolBridge } from "../../../../../web/openAi/core/bridge/WebOpenAiToolBridge.js";
import type { WorkspaceOpenAiToolBridge } from "../../../../../workspace/tools/core/bridge/WorkspaceOpenAiToolBridge.js";
import type { OpenAIChatTool } from "../../../../chat/model/tool/OpenAIChatTool.js";
import type { OpenAiToolExecutionResult } from "../../../runtime/model/result/OpenAiToolExecutionResult.js";
import { OpenAiToolRegistryComponents } from "../components/OpenAiToolRegistryComponents.js";
import type { SkillRegistry } from "../../../../../skills/core/SkillRegistry.js";
import { ExpandSkillTool } from "../../../../../skills/tools/ExpandSkillTool.js";

export class OpenAiToolRegistry {
  private readonly components: OpenAiToolRegistryComponents;
  private readonly expandSkillTool?: ExpandSkillTool;

  constructor(
    workspaceOpenAiToolBridge?: WorkspaceOpenAiToolBridge,
    webOpenAiToolBridge?: WebOpenAiToolBridge,
    ragOpenAiToolBridge?: RagOpenAiToolBridge,
    memoryOpenAiToolBridge?: MemoryOpenAiToolBridge,
    mcpOpenAiToolBridge?: McpOpenAiToolBridge,
    skillRegistry?: SkillRegistry
  ) {
    this.components = new OpenAiToolRegistryComponents(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge,
      mcpOpenAiToolBridge
    );
    this.expandSkillTool = skillRegistry ? new ExpandSkillTool(skillRegistry) : undefined;
  }

  async listTools(): Promise<OpenAIChatTool[]> {
    const tools = await this.components.toolCatalogAggregator.listTools();
    if (this.expandSkillTool) {
      tools.push(this.expandSkillTool.create());
    }
    return tools;
  }

  async executeTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    return this.components.toolExecutorRouter.executeTool(chatRequest, toolName, toolArgs);
  }
}
