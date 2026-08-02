import type { AgentConfig } from "../config/AgentConfig.js";
import { McpConfigParser } from "../mcp/McpConfigParser.js";
import type { McpServerConfig } from "../mcp/McpServerConfig.js";

export class AgentMcpConfigFactory {
  private readonly configParser = new McpConfigParser();

  create(config: AgentConfig): McpServerConfig[] {
    return config.mcpToolsEnabled ? this.configParser.parseServerConfigs(config.mcpServers) : [];
  }
}
