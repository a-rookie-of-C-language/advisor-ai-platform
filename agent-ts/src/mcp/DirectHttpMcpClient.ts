import type { JsonObject } from "../common/JsonTypes.js";
import { DirectHttpMcpJsonRpcClient } from "./DirectHttpMcpJsonRpcClient.js";
import { JsonObjectReader } from "../common/JsonObjectReader.js";
import { McpCallToolResultMapper } from "./McpCallToolResultMapper.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import { McpToolDescriptorMapper } from "./McpToolDescriptorMapper.js";
import type { McpServerConfig } from "./McpServerConfig.js";

export class DirectHttpMcpClient {
  private initialized = false;
  private readonly callToolResultMapper = new McpCallToolResultMapper();
  private readonly jsonObjectReader = new JsonObjectReader();
  private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient;
  private readonly toolDescriptorMapper = new McpToolDescriptorMapper();

  constructor(private readonly config: McpServerConfig) {
    this.jsonRpcClient = new DirectHttpMcpJsonRpcClient(config);
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    await this.ensureInitialized();
    const response = await this.jsonRpcClient.post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const result = this.jsonObjectReader.asObject(response.result);
    return this.toolDescriptorMapper.mapTools(result, this.config.name);
  }

  async callTool(name: string, args: JsonObject): Promise<McpCallToolResult> {
    await this.ensureInitialized();
    const response = await this.jsonRpcClient.post({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name, arguments: args }
    });
    const result = this.jsonObjectReader.asObject(response.result);
    return this.callToolResultMapper.mapResult(result);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.jsonRpcClient.post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    this.initialized = true;
  }
}
