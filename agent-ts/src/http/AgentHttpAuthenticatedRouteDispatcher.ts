import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentWorkspaceRouteHandler } from "../workspace/routes/AgentWorkspaceRouteHandler.js";
import type { AgentHttpRouteResultWriter } from "./AgentHttpRouteResultWriter.js";
import type { AgentJsonResponseWriter } from "./AgentJsonResponseWriter.js";
import type { AgentChatStreamRouteHandler } from "./routes/AgentChatStreamRouteHandler.js";
import type { AgentMcpRouteHandler } from "./routes/AgentMcpRouteHandler.js";

export class AgentHttpAuthenticatedRouteDispatcher {
  constructor(
    private readonly chatStreamRouteHandler: AgentChatStreamRouteHandler,
    private readonly jsonResponseWriter: AgentJsonResponseWriter,
    private readonly mcpRouteHandler: AgentMcpRouteHandler,
    private readonly routeResultWriter: AgentHttpRouteResultWriter,
    private readonly workspaceRouteHandler: AgentWorkspaceRouteHandler
  ) {}

  async dispatch(url: URL, request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (await this.chatStreamRouteHandler.handle(request.method, url, request, response)) {
      return;
    }

    const workspaceResult = await this.workspaceRouteHandler.handle(request.method, url, request);
    if (this.routeResultWriter.writeIfPresent(response, workspaceResult)) {
      return;
    }

    const mcpResult = await this.mcpRouteHandler.handle(request.method, url, request);
    if (this.routeResultWriter.writeIfPresent(response, mcpResult)) {
      return;
    }

    this.jsonResponseWriter.write(response, 404, { detail: "not found" });
  }
}
