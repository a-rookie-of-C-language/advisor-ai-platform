import { DirectHttpMcpJsonRpcClient } from "./protocol/DirectHttpMcpJsonRpcClient.js";
import { McpJsonRpcRequestFactory } from "../jsonRpc/McpJsonRpcRequestFactory.js";

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
