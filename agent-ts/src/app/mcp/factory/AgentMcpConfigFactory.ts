import type { AgentConfig } from "../../../config/model/AgentConfig.js";
import { McpConfigParser } from "../../../mcp/config/parser/McpConfigParser.js";
import type { McpServerConfig } from "../../../mcp/config/model/McpServerConfig.js";

export class AgentMcpConfigFactory {
  private readonly configParser = new McpConfigParser();

  create(config: AgentConfig): McpServerConfig[] {
    return config.mcpToolsEnabled ? this.configParser.parseServerConfigs(config.mcpServers) : [];
  }
}
