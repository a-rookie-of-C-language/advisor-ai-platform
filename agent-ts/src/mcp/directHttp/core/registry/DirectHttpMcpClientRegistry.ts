import type { McpServerConfig } from "../../../config/model/McpServerConfig.js";
import { DirectHttpMcpClient } from "../client/DirectHttpMcpClient.js";

export class DirectHttpMcpClientRegistry {
  private readonly clients = new Map<string, DirectHttpMcpClient>();

  clientFor(config: McpServerConfig): DirectHttpMcpClient {
    const existing = this.clients.get(config.name);
    if (existing) {
      return existing;
    }
    const client = new DirectHttpMcpClient(config);
    this.clients.set(config.name, client);
    return client;
  }
}
