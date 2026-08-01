import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentWorkspaceRouteHandler } from "../workspace/routes/AgentWorkspaceRouteHandler.js";
import type { AgentJsonResponseWriter } from "./AgentJsonResponseWriter.js";
import type { AgentRequestAuthorizer } from "./AgentRequestAuthorizer.js";
import type { AgentRequestUrlFactory } from "./AgentRequestUrlFactory.js";
import type { AgentChatStreamRouteHandler } from "./routes/AgentChatStreamRouteHandler.js";
import type { AgentHealthRouteHandler } from "./routes/AgentHealthRouteHandler.js";
import type { AgentMcpRouteHandler } from "./routes/AgentMcpRouteHandler.js";

export class AgentHttpRouter {
  constructor(
    private readonly authorizer: AgentRequestAuthorizer,
    private readonly chatStreamRouteHandler: AgentChatStreamRouteHandler,
    private readonly healthRouteHandler: AgentHealthRouteHandler,
    private readonly jsonResponseWriter: AgentJsonResponseWriter,
    private readonly mcpRouteHandler: AgentMcpRouteHandler,
    private readonly requestUrlFactory: AgentRequestUrlFactory,
    private readonly workspaceRouteHandler: AgentWorkspaceRouteHandler
  ) {}

  async route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = this.requestUrlFactory.create(request);
      const healthResult = await this.healthRouteHandler.handle(request.method, url);
      if (healthResult) {
        this.jsonResponseWriter.write(response, healthResult.statusCode, healthResult.body);
        return;
      }

      if (!this.authorizer.isAuthorized(request)) {
        this.jsonResponseWriter.write(response, 401, { detail: "invalid agent token" });
        return;
      }

      if (await this.chatStreamRouteHandler.handle(request.method, url, request, response)) {
        return;
      }

      const workspaceResult = await this.workspaceRouteHandler.handle(request.method, url, request);
      if (workspaceResult) {
        this.jsonResponseWriter.write(response, workspaceResult.statusCode, workspaceResult.body);
        return;
      }

      const mcpResult = await this.mcpRouteHandler.handle(request.method, url, request);
      if (mcpResult) {
        this.jsonResponseWriter.write(response, mcpResult.statusCode, mcpResult.body);
        return;
      }

      this.jsonResponseWriter.write(response, 404, { detail: "not found" });
    } catch (error) {
      this.jsonResponseWriter.writeError(response, error);
    }
  }
}
