import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpClientRegistry } from "./DirectHttpMcpClientRegistry.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpServerConfig } from "./McpServerConfig.js";
import { McpSupportedConfigSelector } from "./McpSupportedConfigSelector.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import { McpToolDescriptorSorter } from "./McpToolDescriptorSorter.js";

export class McpToolService {
  private readonly clientRegistry = new DirectHttpMcpClientRegistry();
  private readonly supportedConfigSelector = new McpSupportedConfigSelector();
  private readonly toolDescriptorSorter = new McpToolDescriptorSorter();

  constructor(private readonly configs: McpServerConfig[]) {}

  async listTools(): Promise<McpToolDescriptor[]> {
    const tools: McpToolDescriptor[] = [];
    for (const config of this.supportedConfigs()) {
      tools.push(...(await this.clientRegistry.clientFor(config).listTools()));
    }
    return this.toolDescriptorSorter.sort(tools);
  }

  async callTool(server: string, name: string, args: JsonObject): Promise<McpCallToolResult> {
    const config = this.supportedConfigs().find((item) => item.name === server);
    if (!config) {
      throw new Error(`未找到 MCP server: ${server}`);
    }
    return this.clientRegistry.clientFor(config).callTool(name, args);
  }

  private supportedConfigs(): McpServerConfig[] {
    return this.supportedConfigSelector.select(this.configs);
  }

}
