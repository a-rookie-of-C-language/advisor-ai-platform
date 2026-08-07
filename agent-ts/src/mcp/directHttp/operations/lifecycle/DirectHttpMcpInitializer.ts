import type { McpJsonRpcRequestFactory } from "../../../jsonRpc/McpJsonRpcRequestFactory.js";
import type { DirectHttpMcpJsonRpcClient } from "../../protocol/core/DirectHttpMcpJsonRpcClient.js";

export class DirectHttpMcpInitializer {
  private initialized = false;

  constructor(
    private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient,
    private readonly requestFactory: McpJsonRpcRequestFactory,
  ) {}

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.jsonRpcClient.post(this.requestFactory.createInitializeRequest());
    this.initialized = true;
  }
}
