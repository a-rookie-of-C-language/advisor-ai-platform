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
import { OpenAiLocalToolCatalogCollector } from "../../catalog/collector/local/OpenAiLocalToolCatalogCollector.js";
import type { SkillRegistry } from "../../../../../skills/core/SkillRegistry.js";
import { ExpandSkillTool } from "../../../../../skills/tools/ExpandSkillTool.js";
import { ToolSearchTool, type ToolSearchSpec } from "../../../../../tools/search/ToolSearchTool.js";

export class OpenAiToolRegistry {
  private readonly components: OpenAiToolRegistryComponents;
  private readonly localToolCatalogCollector: OpenAiLocalToolCatalogCollector;
  private readonly skillRegistry?: SkillRegistry;
  private readonly expandSkillTool?: ExpandSkillTool;
  private readonly toolSearchTool?: ToolSearchTool;

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
    this.localToolCatalogCollector = new OpenAiLocalToolCatalogCollector(
      workspaceOpenAiToolBridge,
      webOpenAiToolBridge,
      ragOpenAiToolBridge,
      memoryOpenAiToolBridge
    );
    this.skillRegistry = skillRegistry;
    this.expandSkillTool = skillRegistry ? new ExpandSkillTool(skillRegistry) : undefined;
    this.toolSearchTool = skillRegistry
      ? new ToolSearchTool(() => this.buildToolSearchSpecs())
      : undefined;
  }

  async listTools(): Promise<OpenAIChatTool[]> {
    const tools = await this.components.toolCatalogAggregator.listTools();
    if (this.expandSkillTool) {
      tools.push(this.expandSkillTool.create());
    }
    if (this.toolSearchTool) {
      tools.push(this.toolSearchTool.create());
    }
    return tools;
  }

  async executeTool(
    chatRequest: ChatStreamRequest,
    toolName: string,
    toolArgs: JsonObject
  ): Promise<OpenAiToolExecutionResult> {
    if (toolName === "expand_skill" && this.expandSkillTool) {
      const skillName = String(toolArgs.skill_name ?? "").trim();
      return {
        output: JSON.stringify(this.expandSkillTool.execute(skillName)),
        success: true
      };
    }
    if (toolName === "tool_search" && this.toolSearchTool) {
      const keywords = String(toolArgs.keywords ?? "").trim();
      const maxResults = Number(toolArgs.max_results ?? 3);
      return {
        output: JSON.stringify(await this.toolSearchTool.execute(keywords, maxResults)),
        success: true
      };
    }
    return this.components.toolExecutorRouter.executeTool(chatRequest, toolName, toolArgs);
  }

  private buildToolSearchSpecs(): ToolSearchSpec[] {
    const specs = this.localToolCatalogCollector.listTools().map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
      searchHint: String((tool.function.parameters as JsonObject).search_hint ?? "")
    }));
    if (this.skillRegistry) {
      const skillSpecs = this.skillRegistry.listAll().map((skill) => ({
        name: skill.name,
        description: skill.description,
        parameters: {
          type: "object",
          properties: {
            skill_name: { type: "string" }
          },
          required: ["skill_name"]
        },
        searchHint: skill.searchHint ?? ""
      }));
      specs.push(...skillSpecs);
    }
    if (this.expandSkillTool) {
      specs.push({
        name: "expand_skill",
        description: "展开指定技能的完整指令，获取更详细的执行指南。当 brief 指令不足以完成任务时调用。",
        parameters: {
          type: "object",
          properties: {
            skill_name: { type: "string" }
          },
          required: ["skill_name"]
        },
        searchHint: "技能,展开,指令,指南"
      });
    }
    return specs;
  }
}
