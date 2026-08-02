import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpHeadersFactory } from "./DirectHttpMcpHeadersFactory.js";
import type { JsonRpcResponse } from "./JsonRpcResponse.js";
import type { McpServerConfig } from "./McpServerConfig.js";

export class DirectHttpMcpJsonRpcClient {
  private readonly headersFactory = new DirectHttpMcpHeadersFactory();
  private readonly headers: Record<string, string>;

  constructor(private readonly config: McpServerConfig) {
    this.headers = this.headersFactory.create(config);
  }

  async post(payload: JsonObject): Promise<JsonRpcResponse> {
    const response = await fetch(this.config.urlOrCommand, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`MCP HTTP 请求失败: ${response.status}`);
    }

    const data = (await response.json()) as JsonRpcResponse;
    if (data.error) {
      throw new Error(`MCP JSON-RPC 错误: ${JSON.stringify(data.error)}`);
    }
    return data;
  }
}
