import { McpServerConfig } from "../model/McpServerConfig.js";
import { McpStdioEnvParser } from "../env/McpStdioEnvParser.js";
import { McpTokenEnvKeyFactory } from "../env/McpTokenEnvKeyFactory.js";

export class McpConfigParser {
  private readonly stdioEnvParser = new McpStdioEnvParser();
  private readonly tokenEnvKeyFactory = new McpTokenEnvKeyFactory();

  parseServerConfigs(servers: string, env: NodeJS.ProcessEnv = process.env): McpServerConfig[] {
    if (!servers.trim()) {
      return [];
    }

    return servers
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean)
      .map((server) => this.parseServerConfig(server, env))
      .filter((config): config is McpServerConfig => config !== undefined);
  }

  parseStdioEnv(rawEnv: string | undefined = process.env.MCP_STDIO_ENV): Record<string, string> | undefined {
    return this.stdioEnvParser.parse(rawEnv);
  }

  private parseServerConfig(server: string, env: NodeJS.ProcessEnv): McpServerConfig | undefined {
    const parts = server.split(":");
    if (parts.length < 3) {
      return undefined;
    }

    const name = parts[0]?.trim() || "";
    const transportType = parts[1]?.trim() || "";
    const urlOrCommand = parts.slice(2).join(":").trim();
    if (!name || !transportType || !urlOrCommand) {
      return undefined;
    }

    const tokenKey = this.tokenEnvKeyFactory.create(name);
    return new McpServerConfig(name, transportType, urlOrCommand, env[tokenKey]?.trim() || undefined);
  }
}
