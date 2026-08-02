import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpInitializer } from "./DirectHttpMcpInitializer.js";
import { DirectHttpMcpJsonRpcClient } from "./DirectHttpMcpJsonRpcClient.js";
import { JsonObjectReader } from "../common/JsonObjectReader.js";
import { McpCallToolResultMapper } from "./McpCallToolResultMapper.js";
import { McpJsonRpcRequestFactory } from "./McpJsonRpcRequestFactory.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import { McpToolDescriptorMapper } from "./McpToolDescriptorMapper.js";
import type { McpServerConfig } from "./McpServerConfig.js";

export class DirectHttpMcpClient {
  private readonly callToolResultMapper = new McpCallToolResultMapper();
  private readonly initializer: DirectHttpMcpInitializer;
  private readonly jsonObjectReader = new JsonObjectReader();
  private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient;
  private readonly requestFactory = new McpJsonRpcRequestFactory();
  private readonly toolDescriptorMapper = new McpToolDescriptorMapper();

  constructor(private readonly config: McpServerConfig) {
    this.jsonRpcClient = new DirectHttpMcpJsonRpcClient(config);
    this.initializer = new DirectHttpMcpInitializer(this.jsonRpcClient, this.requestFactory);
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    await this.initializer.ensureInitialized();
    const response = await this.jsonRpcClient.post(this.requestFactory.createListToolsRequest());
    const result = this.jsonObjectReader.asObject(response.result);
    return this.toolDescriptorMapper.mapTools(result, this.config.name);
  }

  async callTool(name: string, args: JsonObject): Promise<McpCallToolResult> {
    await this.initializer.ensureInitialized();
    const response = await this.jsonRpcClient.post(this.requestFactory.createCallToolRequest(name, args));
    const result = this.jsonObjectReader.asObject(response.result);
    return this.callToolResultMapper.mapResult(result);
  }
}
