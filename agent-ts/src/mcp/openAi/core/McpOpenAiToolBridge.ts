import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import { OpenAiToolResultFactory } from "../../../openai/tools/runtime/factory/OpenAiToolResultFactory.js";
import type { OpenAiToolExecutionResult } from "../../../openai/tools/runtime/model/OpenAiToolExecutionResult.js";
import type { McpToolService } from "../../tools/core/service/McpToolService.js";
import { McpOpenAiToolCatalog } from "../catalog/McpOpenAiToolCatalog.js";
import { McpOpenAiToolResultFormatter } from "../result/McpOpenAiToolResultFormatter.js";

export class McpOpenAiToolBridge {
  private readonly catalog = new McpOpenAiToolCatalog();
  private readonly resultFormatter = new McpOpenAiToolResultFormatter();

  constructor(private readonly mcpToolService: McpToolService) {}

  async listTools(): Promise<OpenAIChatTool[]> {
    const descriptors = await this.mcpToolService.listTools();
    return this.catalog.listTools(descriptors);
  }

  async executeTool(openAiToolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const target = this.catalog.resolveTarget(openAiToolName);
    if (!target) {
      return OpenAiToolResultFactory.error(`未知 MCP 工具: ${openAiToolName}`);
    }

    const result = await this.mcpToolService.callTool(target.server, target.name, args);
    return this.resultFormatter.format(result);
  }
}
