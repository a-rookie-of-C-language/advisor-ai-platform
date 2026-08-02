import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpInitializer } from "./DirectHttpMcpInitializer.js";
import { DirectHttpMcpJsonRpcClient } from "./DirectHttpMcpJsonRpcClient.js";
import { JsonObjectReader } from "../common/JsonObjectReader.js";
import { DirectHttpMcpToolListReader } from "./DirectHttpMcpToolListReader.js";
import { McpCallToolResultMapper } from "./McpCallToolResultMapper.js";
import { McpJsonRpcRequestFactory } from "./McpJsonRpcRequestFactory.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import type { McpServerConfig } from "./McpServerConfig.js";

export class DirectHttpMcpClient {
  private readonly callToolResultMapper = new McpCallToolResultMapper();
  private readonly initializer: DirectHttpMcpInitializer;
  private readonly jsonObjectReader = new JsonObjectReader();
  private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient;
  private readonly requestFactory = new McpJsonRpcRequestFactory();
  private readonly toolListReader: DirectHttpMcpToolListReader;

  constructor(config: McpServerConfig) {
    this.jsonRpcClient = new DirectHttpMcpJsonRpcClient(config);
    this.initializer = new DirectHttpMcpInitializer(this.jsonRpcClient, this.requestFactory);
    this.toolListReader = new DirectHttpMcpToolListReader(
      config.name,
      this.initializer,
      this.jsonRpcClient,
      this.requestFactory,
    );
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    return this.toolListReader.listTools();
  }

  async callTool(name: string, args: JsonObject): Promise<McpCallToolResult> {
    await this.initializer.ensureInitialized();
    const response = await this.jsonRpcClient.post(this.requestFactory.createCallToolRequest(name, args));
    const result = this.jsonObjectReader.asObject(response.result);
    return this.callToolResultMapper.mapResult(result);
  }
}
