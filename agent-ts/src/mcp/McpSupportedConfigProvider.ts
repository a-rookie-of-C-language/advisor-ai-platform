import type { McpServerConfig } from "./McpServerConfig.js";
import { McpSupportedConfigSelector } from "./McpSupportedConfigSelector.js";

export class McpSupportedConfigProvider {
  private readonly supportedConfigSelector = new McpSupportedConfigSelector();

  constructor(private readonly configs: McpServerConfig[]) {}

  list(): McpServerConfig[] {
    return this.supportedConfigSelector.select(this.configs);
  }
}
