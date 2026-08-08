import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";
import { DirectHttpMcpClientRegistry } from "../../../../directHttp/core/registry/DirectHttpMcpClientRegistry.js";
import { McpSupportedConfigProvider } from "../../../../config/selection/provider/McpSupportedConfigProvider.js";
import type { McpCallToolResult } from "../../../model/result/McpCallToolResult.js";

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
