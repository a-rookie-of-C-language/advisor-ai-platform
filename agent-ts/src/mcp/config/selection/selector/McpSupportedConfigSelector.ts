import type { McpServerConfig } from "../../model/McpServerConfig.js";

export class McpSupportedConfigSelector {
  select(configs: McpServerConfig[]): McpServerConfig[] {
    return configs.filter((config) => ["http", "direct_http"].includes(config.transportType));
  }
}
