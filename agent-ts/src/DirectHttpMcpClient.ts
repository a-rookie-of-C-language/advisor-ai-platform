import type { JsonObject } from "./JsonTypes.js";
import { JsonObjectReader } from "./JsonObjectReader.js";
import type { McpCallToolResult } from "./McpCallToolResult.js";
import type { McpToolDescriptor } from "./McpToolDescriptor.js";
import type { McpServerConfig } from "./McpServerConfig.js";

interface JsonRpcResponse {
  result?: unknown;
  error?: unknown;
}

export class DirectHttpMcpClient {
  private initialized = false;
  private readonly headers: Record<string, string>;
  private readonly jsonObjectReader = new JsonObjectReader();

  constructor(private readonly config: McpServerConfig) {
    this.headers = { "Content-Type": "application/json" };
    if (config.token) {
      this.headers.Authorization = `Bearer ${config.token}`;
    }
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    await this.ensureInitialized();
    const response = await this.post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
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
    const response = await this.post({
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
    await this.post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    this.initialized = true;
  }

  private async post(payload: JsonObject): Promise<JsonRpcResponse> {
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
