import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentWorkspaceRouteHandler } from "../../../workspace/routes/core/handler/AgentWorkspaceRouteHandler.js";
import type { AgentRequestUrlFactory } from "../../request/AgentRequestUrlFactory.js";
import { AgentHttpRouteResultWriter } from "../../response/core/AgentHttpRouteResultWriter.js";
import type { AgentJsonResponseWriter } from "../../response/core/AgentJsonResponseWriter.js";
import type { AgentChatStreamRouteHandler } from "../../routes/chat/AgentChatStreamRouteHandler.js";
import type { AgentHealthRouteHandler } from "../../routes/health/AgentHealthRouteHandler.js";
import type { AgentMcpRouteHandler } from "../../routes/mcp/core/AgentMcpRouteHandler.js";
import { AgentHttpAuthenticatedRouteDispatcher } from "../dispatch/AgentHttpAuthenticatedRouteDispatcher.js";
import { AgentHttpPublicRouteDispatcher } from "../dispatch/AgentHttpPublicRouteDispatcher.js";
import type { AgentRequestAuthorizer } from "../security/AgentRequestAuthorizer.js";

export class AgentHttpRouter {
  private readonly authenticatedRouteDispatcher: AgentHttpAuthenticatedRouteDispatcher;
  private readonly publicRouteDispatcher: AgentHttpPublicRouteDispatcher;
  private readonly routeResultWriter: AgentHttpRouteResultWriter;

  constructor(
    private readonly authorizer: AgentRequestAuthorizer,
    private readonly chatStreamRouteHandler: AgentChatStreamRouteHandler,
    private readonly healthRouteHandler: AgentHealthRouteHandler,
    private readonly jsonResponseWriter: AgentJsonResponseWriter,
    private readonly mcpRouteHandler: AgentMcpRouteHandler,
    private readonly requestUrlFactory: AgentRequestUrlFactory,
    private readonly workspaceRouteHandler: AgentWorkspaceRouteHandler
  ) {
    this.routeResultWriter = new AgentHttpRouteResultWriter(this.jsonResponseWriter);
    this.authenticatedRouteDispatcher = new AgentHttpAuthenticatedRouteDispatcher(
      this.chatStreamRouteHandler,
      this.jsonResponseWriter,
      this.mcpRouteHandler,
      this.routeResultWriter,
      this.workspaceRouteHandler
    );
    this.publicRouteDispatcher = new AgentHttpPublicRouteDispatcher(this.healthRouteHandler, this.routeResultWriter);
  }

  async route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = this.requestUrlFactory.create(request);
      if (await this.publicRouteDispatcher.dispatch(request.method, url, response)) {
        return;
      }

      if (!this.authorizer.isAuthorized(request)) {
        this.jsonResponseWriter.write(response, 401, { detail: "invalid agent token" });
        return;
      }

      await this.authenticatedRouteDispatcher.dispatch(url, request, response);
    } catch (error) {
      this.jsonResponseWriter.writeError(response, error);
    }
  }
}
