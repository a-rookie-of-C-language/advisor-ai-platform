import type { McpOpenAiToolTarget } from "./McpOpenAiToolTarget.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import type { OpenAIChatTool } from "./OpenAIChatTool.js";

export class McpOpenAiToolCatalog {
  private readonly toolTargets = new Map<string, McpOpenAiToolTarget>();

  listTools(descriptors: McpToolDescriptor[]): OpenAIChatTool[] {
    this.toolTargets.clear();
    return descriptors.map((descriptor) => this.toOpenAiTool(descriptor));
  }

  resolveTarget(openAiToolName: string): McpOpenAiToolTarget | undefined {
    return this.toolTargets.get(openAiToolName);
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
