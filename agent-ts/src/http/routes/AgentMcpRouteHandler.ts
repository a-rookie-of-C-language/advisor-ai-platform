import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../HttpRouteResult.js";
import type { McpToolService } from "../../mcp/McpToolService.js";
import { McpToolServiceGuard } from "../../mcp/McpToolServiceGuard.js";

export class AgentMcpRouteHandler {
  private readonly mcpToolServiceGuard = new McpToolServiceGuard();

  constructor(
    private readonly mcpToolService: McpToolService | undefined,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "GET" && url.pathname === "/mcp/tools") {
      const mcpToolService = this.mcpToolServiceGuard.requireEnabled(this.mcpToolService);
      return { statusCode: 200, body: { status: "ok", tools: await mcpToolService.listTools() } };
    }

    if (method === "POST" && url.pathname === "/mcp/call") {
      const mcpToolService = this.mcpToolServiceGuard.requireEnabled(this.mcpToolService);
      const body = await this.requestReader.readJsonObject(request);
      const result = await mcpToolService.callTool(
        this.requestReader.readRequiredString(body, "server"),
        this.requestReader.readRequiredString(body, "name"),
        this.requestReader.readOptionalJsonObject(body, "arguments")
      );
      return { statusCode: 200, body: { status: "ok", result } };
    }

    return null;
  }
}
