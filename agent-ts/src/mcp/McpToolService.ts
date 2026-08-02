import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpClientRegistry } from "./DirectHttpMcpClientRegistry.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpServerConfig } from "./McpServerConfig.js";
import { McpSupportedConfigProvider } from "./McpSupportedConfigProvider.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import { McpToolDescriptorSorter } from "./McpToolDescriptorSorter.js";

export class McpToolService {
  private readonly clientRegistry = new DirectHttpMcpClientRegistry();
  private readonly supportedConfigProvider: McpSupportedConfigProvider;
  private readonly toolDescriptorSorter = new McpToolDescriptorSorter();

  constructor(configs: McpServerConfig[]) {
    this.supportedConfigProvider = new McpSupportedConfigProvider(configs);
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    const tools: McpToolDescriptor[] = [];
    for (const config of this.supportedConfigProvider.list()) {
      tools.push(...(await this.clientRegistry.clientFor(config).listTools()));
    }
    return this.toolDescriptorSorter.sort(tools);
  }

  async callTool(server: string, name: string, args: JsonObject): Promise<McpCallToolResult> {
    const config = this.supportedConfigProvider.list().find((item) => item.name === server);
    if (!config) {
      throw new Error(`未找到 MCP server: ${server}`);
    }
    return this.clientRegistry.clientFor(config).callTool(name, args);
  }

}
