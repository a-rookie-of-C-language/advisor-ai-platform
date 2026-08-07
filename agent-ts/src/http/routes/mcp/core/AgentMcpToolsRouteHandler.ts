import type { HttpRouteResult } from "../../../response/HttpRouteResult.js";
import type { McpToolService } from "../../../../mcp/tools/core/McpToolService.js";
import { McpToolServiceGuard } from "../../../../mcp/tools/core/McpToolServiceGuard.js";

export class AgentMcpToolsRouteHandler {
  private readonly mcpToolServiceGuard = new McpToolServiceGuard();

  constructor(private readonly mcpToolService: McpToolService | undefined) {}

  async handle(method: string | undefined, url: URL): Promise<HttpRouteResult | null> {
    if (method !== "GET" || url.pathname !== "/mcp/tools") {
      return null;
    }

    const mcpToolService = this.mcpToolServiceGuard.requireEnabled(this.mcpToolService);
    return { statusCode: 200, body: { status: "ok", tools: await mcpToolService.listTools() } };
  }
}
