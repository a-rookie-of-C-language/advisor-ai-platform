import type { OpenAIChatTool } from "../../../openai/chat/model/tool/OpenAIChatTool.js";
import type { McpToolDescriptor } from "../../tools/model/descriptor/McpToolDescriptor.js";
import type { McpOpenAiToolTarget } from "../model/McpOpenAiToolTarget.js";
import { McpOpenAiToolNameFactory } from "../naming/McpOpenAiToolNameFactory.js";

export class McpOpenAiToolCatalog {
  private readonly toolTargets = new Map<string, McpOpenAiToolTarget>();
  private readonly toolNameFactory = new McpOpenAiToolNameFactory();

  listTools(descriptors: McpToolDescriptor[]): OpenAIChatTool[] {
    this.toolTargets.clear();
    return descriptors.map((descriptor) => this.toOpenAiTool(descriptor));
  }

  resolveTarget(openAiToolName: string): McpOpenAiToolTarget | undefined {
    return this.toolTargets.get(openAiToolName);
  }

  private toOpenAiTool(descriptor: McpToolDescriptor): OpenAIChatTool {
    const openAiName = this.toolNameFactory.create(descriptor.server, descriptor.name);
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
}
