import type { McpServerConfig } from "../../../config/model/McpServerConfig.js";

export class DirectHttpMcpHeadersFactory {
  create(config: McpServerConfig): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }
    return headers;
  }
}
