import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpClient } from "./DirectHttpMcpClient.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpServerConfig } from "./McpServerConfig.js";
import { McpSupportedConfigSelector } from "./McpSupportedConfigSelector.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";

export class McpToolService {
  private readonly clients = new Map<string, DirectHttpMcpClient>();
  private readonly supportedConfigSelector = new McpSupportedConfigSelector();

  constructor(private readonly configs: McpServerConfig[]) {}

  async listTools(): Promise<McpToolDescriptor[]> {
    const tools: McpToolDescriptor[] = [];
    for (const config of this.supportedConfigs()) {
      tools.push(...(await this.clientFor(config).listTools()));
    }
    return tools.sort((left, right) => `${left.server}:${left.name}`.localeCompare(`${right.server}:${right.name}`));
  }

  async callTool(server: string, name: string, args: JsonObject): Promise<McpCallToolResult> {
    const config = this.supportedConfigs().find((item) => item.name === server);
    if (!config) {
      throw new Error(`未找到 MCP server: ${server}`);
    }
    return this.clientFor(config).callTool(name, args);
  }

  private supportedConfigs(): McpServerConfig[] {
    return this.supportedConfigSelector.select(this.configs);
  }

  private clientFor(config: McpServerConfig): DirectHttpMcpClient {
    const existing = this.clients.get(config.name);
    if (existing) {
      return existing;
    }
    const client = new DirectHttpMcpClient(config);
    this.clients.set(config.name, client);
    return client;
  }
}
