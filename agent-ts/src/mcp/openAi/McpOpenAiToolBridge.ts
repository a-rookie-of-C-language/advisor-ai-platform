import type { JsonObject } from "../../common/JsonTypes.js";
import { McpOpenAiToolCatalog } from "./McpOpenAiToolCatalog.js";
import { McpOpenAiToolResultFormatter } from "./McpOpenAiToolResultFormatter.js";
import type { McpToolService } from "../tools/McpToolService.js";
import type { OpenAiToolExecutionResult } from "../../openai/tools/runtime/OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "../../openai/OpenAIChatTool.js";
import { OpenAiToolResultFactory } from "../../openai/tools/runtime/OpenAiToolResultFactory.js";

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
