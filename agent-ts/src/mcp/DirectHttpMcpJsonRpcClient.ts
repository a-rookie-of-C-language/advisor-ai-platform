import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpHeadersFactory } from "./DirectHttpMcpHeadersFactory.js";
import { DirectHttpMcpResponseValidator } from "./DirectHttpMcpResponseValidator.js";
import type { JsonRpcResponse } from "./JsonRpcResponse.js";
import type { McpServerConfig } from "./McpServerConfig.js";

export class DirectHttpMcpJsonRpcClient {
  private readonly headersFactory = new DirectHttpMcpHeadersFactory();
  private readonly headers: Record<string, string>;
  private readonly responseValidator = new DirectHttpMcpResponseValidator();

  constructor(private readonly config: McpServerConfig) {
    this.headers = this.headersFactory.create(config);
  }

  async post(payload: JsonObject): Promise<JsonRpcResponse> {
    const response = await fetch(this.config.urlOrCommand, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    this.responseValidator.validateHttp(response);

    const data = (await response.json()) as JsonRpcResponse;
    this.responseValidator.validateJsonRpc(data);
    return data;
  }
}
