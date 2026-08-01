import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../HttpRouteResult.js";
import type { McpToolService } from "../../mcp/McpToolService.js";
import { WorkspaceError } from "../../workspace/WorkspaceError.js";

export class AgentMcpRouteHandler {
  constructor(
    private readonly mcpToolService: McpToolService | undefined,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "GET" && url.pathname === "/mcp/tools") {
      const mcpToolService = this.requireMcpToolService();
      return { statusCode: 200, body: { status: "ok", tools: await mcpToolService.listTools() } };
    }

    if (method === "POST" && url.pathname === "/mcp/call") {
      const mcpToolService = this.requireMcpToolService();
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

  private requireMcpToolService(): McpToolService {
    if (!this.mcpToolService) {
      throw new WorkspaceError("MCP tools 未启用");
    }
    return this.mcpToolService;
  }
}
