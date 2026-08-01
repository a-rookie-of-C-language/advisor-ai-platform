import type { JsonObject } from "./JsonTypes.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import type { McpToolService } from "./McpToolService.js";
import type { OpenAiToolExecutionResult } from "./OpenAiToolExecutionResult.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";

interface McpToolTarget {
  server: string;
  name: string;
}

export class McpOpenAiToolBridge {
  private readonly toolTargets = new Map<string, McpToolTarget>();

  constructor(private readonly mcpToolService: McpToolService) {}

  async listTools(): Promise<OpenAIChatTool[]> {
    const descriptors = await this.mcpToolService.listTools();
    this.toolTargets.clear();
    return descriptors.map((descriptor) => this.toOpenAiTool(descriptor));
  }

  async executeTool(openAiToolName: string, args: JsonObject): Promise<OpenAiToolExecutionResult> {
    const target = this.toolTargets.get(openAiToolName);
    if (!target) {
      return {
        output: JSON.stringify({ ok: false, status: "error", message: `未知 MCP 工具: ${openAiToolName}`, items: [] }),
        success: false
      };
    }

    const result = await this.mcpToolService.callTool(target.server, target.name, args);
    const text = result.content.map((item) => item.text).filter(Boolean).join("\n");
    return {
      output: text || JSON.stringify(result),
      success: !result.isError
    };
  }

  private toOpenAiTool(descriptor: McpToolDescriptor): OpenAIChatTool {
    const openAiName = this.toOpenAiName(descriptor.server, descriptor.name);
    this.toolTargets.set(openAiName, { server: descriptor.server, name: descriptor.name });
    return {
      type: "function",
      function: {
        name: openAiName,
        description: descriptor.description || `${descriptor.server}:${descriptor.name}`,
        parameters: descriptor.inputSchema
      }
    };
  }

  private toOpenAiName(server: string, name: string): string {
    const sanitized = `mcp_${server}_${name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    return sanitized.slice(0, 64);
  }
}
