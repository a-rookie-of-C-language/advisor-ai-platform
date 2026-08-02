import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../HttpRouteResult.js";
import type { McpToolService } from "../../mcp/McpToolService.js";
import { McpToolServiceGuard } from "../../mcp/McpToolServiceGuard.js";
import { AgentMcpToolCallRequestReader } from "./AgentMcpToolCallRequestReader.js";

export class AgentMcpRouteHandler {
  private readonly callRequestReader: AgentMcpToolCallRequestReader;
  private readonly mcpToolServiceGuard = new McpToolServiceGuard();

  constructor(
    private readonly mcpToolService: McpToolService | undefined,
    private readonly requestReader: AgentHttpRequestReader
  ) {
    this.callRequestReader = new AgentMcpToolCallRequestReader(this.requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "GET" && url.pathname === "/mcp/tools") {
      const mcpToolService = this.mcpToolServiceGuard.requireEnabled(this.mcpToolService);
      return { statusCode: 200, body: { status: "ok", tools: await mcpToolService.listTools() } };
    }

    if (method === "POST" && url.pathname === "/mcp/call") {
      const mcpToolService = this.mcpToolServiceGuard.requireEnabled(this.mcpToolService);
      const callRequest = await this.callRequestReader.read(request);
      const result = await mcpToolService.callTool(callRequest.server, callRequest.name, callRequest.args);
      return { statusCode: 200, body: { status: "ok", result } };
    }

    return null;
  }
}
