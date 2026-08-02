import type { JsonObject } from "../../common/JsonTypes.js";
import type { McpServerConfig } from "../config/McpServerConfig.js";

export class DirectHttpMcpTransport {
  constructor(
    private readonly config: McpServerConfig,
    private readonly headers: Record<string, string>,
  ) {}

  async post(payload: JsonObject): Promise<Response> {
    return fetch(this.config.urlOrCommand, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload)
    });
  }
}
