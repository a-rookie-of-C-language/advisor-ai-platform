import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import type { McpServerConfig } from "../../../config/model/McpServerConfig.js";
import type { JsonRpcResponse } from "../../../jsonRpc/model/JsonRpcResponse.js";
import { DirectHttpMcpHeadersFactory } from "../http/DirectHttpMcpHeadersFactory.js";
import { DirectHttpMcpResponseReader } from "../reader/DirectHttpMcpResponseReader.js";
import { DirectHttpMcpTransport } from "../http/DirectHttpMcpTransport.js";

export class DirectHttpMcpJsonRpcClient {
  private readonly headersFactory = new DirectHttpMcpHeadersFactory();
  private readonly headers: Record<string, string>;
  private readonly responseReader = new DirectHttpMcpResponseReader();
  private readonly transport: DirectHttpMcpTransport;

  constructor(config: McpServerConfig) {
    this.headers = this.headersFactory.create(config);
    this.transport = new DirectHttpMcpTransport(config, this.headers);
  }

  async post(payload: JsonObject): Promise<JsonRpcResponse> {
    const response = await this.transport.post(payload);
    return this.responseReader.read(response);
  }
}
