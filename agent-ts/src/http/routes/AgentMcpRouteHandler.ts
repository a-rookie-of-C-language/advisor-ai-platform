import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../HttpRouteResult.js";
import type { McpToolService } from "../../mcp/McpToolService.js";
import { AgentMcpToolCallRouteHandler } from "./AgentMcpToolCallRouteHandler.js";
import { AgentMcpToolsRouteHandler } from "./AgentMcpToolsRouteHandler.js";

export class AgentMcpRouteHandler {
  private readonly toolCallRouteHandler: AgentMcpToolCallRouteHandler;
  private readonly toolsRouteHandler: AgentMcpToolsRouteHandler;

  constructor(
    mcpToolService: McpToolService | undefined,
    requestReader: AgentHttpRequestReader
  ) {
    this.toolCallRouteHandler = new AgentMcpToolCallRouteHandler(mcpToolService, requestReader);
    this.toolsRouteHandler = new AgentMcpToolsRouteHandler(mcpToolService);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    const toolsResult = await this.toolsRouteHandler.handle(method, url);
    if (toolsResult) {
      return toolsResult;
    }

    return this.toolCallRouteHandler.handle(method, url, request);
  }
}
