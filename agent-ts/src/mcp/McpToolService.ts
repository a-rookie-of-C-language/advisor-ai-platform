import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpClientRegistry } from "./DirectHttpMcpClientRegistry.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpServerConfig } from "./McpServerConfig.js";
import { McpSupportedConfigProvider } from "./McpSupportedConfigProvider.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import { McpToolLister } from "./McpToolLister.js";

export class McpToolService {
  private readonly clientRegistry = new DirectHttpMcpClientRegistry();
  private readonly supportedConfigProvider: McpSupportedConfigProvider;
  private readonly toolLister: McpToolLister;

  constructor(configs: McpServerConfig[]) {
    this.supportedConfigProvider = new McpSupportedConfigProvider(configs);
    this.toolLister = new McpToolLister(this.supportedConfigProvider, this.clientRegistry);
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    return this.toolLister.list();
  }

  async callTool(server: string, name: string, args: JsonObject): Promise<McpCallToolResult> {
    const config = this.supportedConfigProvider.list().find((item) => item.name === server);
    if (!config) {
      throw new Error(`未找到 MCP server: ${server}`);
    }
    return this.clientRegistry.clientFor(config).callTool(name, args);
  }
}
