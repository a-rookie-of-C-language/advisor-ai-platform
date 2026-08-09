import type { McpServerConfig } from "../../model/McpServerConfig.js";
import { McpSupportedConfigSelector } from "../selector/McpSupportedConfigSelector.js";

export class McpSupportedConfigProvider {
  private readonly supportedConfigSelector = new McpSupportedConfigSelector();

  constructor(private readonly configs: McpServerConfig[]) {}

  list(): McpServerConfig[] {
    return this.supportedConfigSelector.select(this.configs);
  }
}
