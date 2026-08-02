import type { McpServerConfig } from "./McpServerConfig.js";

export class McpSupportedConfigSelector {
  select(configs: McpServerConfig[]): McpServerConfig[] {
    return configs.filter((config) => ["http", "direct_http"].includes(config.transportType));
  }
}
