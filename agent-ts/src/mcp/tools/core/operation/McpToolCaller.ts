import type { JsonObject } from "../../../../common/json/JsonTypes.js";
import { DirectHttpMcpClientRegistry } from "../../../directHttp/core/registry/DirectHttpMcpClientRegistry.js";
import { McpSupportedConfigProvider } from "../../../config/selection/McpSupportedConfigProvider.js";
import type { McpCallToolResult } from "../../model/McpCallToolResult.js";

export class McpToolCaller {
  constructor(
    private readonly supportedConfigProvider: McpSupportedConfigProvider,
    private readonly clientRegistry: DirectHttpMcpClientRegistry,
  ) {}

  async call(server: string, name: string, args: JsonObject): Promise<McpCallToolResult> {
    const config = this.supportedConfigProvider.list().find((item) => item.name === server);
    if (!config) {
      throw new Error(`未找到 MCP server: ${server}`);
    }
    return this.clientRegistry.clientFor(config).callTool(name, args);
  }
}
