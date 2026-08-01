import { McpServerConfig } from "./McpServerConfig.js";

export class McpConfigParser {
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
    if (!rawEnv?.trim()) {
      return undefined;
    }

    const env: Record<string, string> = {};
    for (const item of rawEnv.trim().split(/\s+/)) {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      env[item.slice(0, separatorIndex)] = item.slice(separatorIndex + 1);
    }
    return Object.keys(env).length > 0 ? env : undefined;
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

    const tokenKey = `MCP_TOKEN_${name.toUpperCase().replaceAll("-", "_")}`;
    return new McpServerConfig(name, transportType, urlOrCommand, env[tokenKey]?.trim() || undefined);
  }
}
