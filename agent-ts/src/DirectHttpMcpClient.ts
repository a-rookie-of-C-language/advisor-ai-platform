import type { JsonObject } from "./JsonTypes.js";
import { DirectHttpMcpJsonRpcClient } from "./DirectHttpMcpJsonRpcClient.js";
import { JsonObjectReader } from "./JsonObjectReader.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import type { McpServerConfig } from "./McpServerConfig.js";

export class DirectHttpMcpClient {
  private initialized = false;
  private readonly jsonObjectReader = new JsonObjectReader();
  private readonly jsonRpcClient: DirectHttpMcpJsonRpcClient;

  constructor(private readonly config: McpServerConfig) {
    this.jsonRpcClient = new DirectHttpMcpJsonRpcClient(config);
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    await this.ensureInitialized();
    const response = await this.jsonRpcClient.post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const result = this.jsonObjectReader.asObject(response.result);
    const tools = Array.isArray(result.tools) ? result.tools : [];
    return tools
      .filter((tool): tool is JsonObject => this.jsonObjectReader.isJsonObject(tool))
      .map((tool) => ({
        name: String(tool.name || ""),
        description: String(tool.description || ""),
        inputSchema: this.jsonObjectReader.asObject(tool.inputSchema),
        server: this.config.name
      }))
      .filter((tool) => tool.name);
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
    const content = Array.isArray(result.content) ? result.content : [];
    return {
      content: content
        .filter((item): item is JsonObject => this.jsonObjectReader.isJsonObject(item))
        .map((item) => ({ type: String(item.type || "text"), text: String(item.text || ""), data: item.data })),
      isError: result.isError === true
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.jsonRpcClient.post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    this.initialized = true;
  }
}
