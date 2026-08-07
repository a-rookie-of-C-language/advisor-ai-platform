import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../response/HttpRouteResult.js";
import type { McpToolService } from "../../../../mcp/tools/core/McpToolService.js";
import { McpToolServiceGuard } from "../../../../mcp/tools/core/McpToolServiceGuard.js";
import { AgentMcpToolCallRequestReader } from "../support/AgentMcpToolCallRequestReader.js";

export class AgentMcpToolCallRouteHandler {
  private readonly callRequestReader: AgentMcpToolCallRequestReader;
  private readonly mcpToolServiceGuard = new McpToolServiceGuard();

  constructor(
    private readonly mcpToolService: McpToolService | undefined,
    requestReader: AgentHttpRequestReader
  ) {
    this.callRequestReader = new AgentMcpToolCallRequestReader(requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method !== "POST" || url.pathname !== "/mcp/call") {
      return null;
    }

    const mcpToolService = this.mcpToolServiceGuard.requireEnabled(this.mcpToolService);
    const callRequest = await this.callRequestReader.read(request);
    const result = await mcpToolService.callTool(callRequest.server, callRequest.name, callRequest.args);
    return { statusCode: 200, body: { status: "ok", result } };
  }
}
