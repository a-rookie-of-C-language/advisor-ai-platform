import { DirectHttpMcpClient } from "./DirectHttpMcpClient.js";
import type { McpServerConfig } from "../McpServerConfig.js";

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
