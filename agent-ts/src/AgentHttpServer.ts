import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { AgentChatStreamRouteHandler } from "./AgentChatStreamRouteHandler.js";
import type { AgentConfig } from "./AgentConfig.js";
import { AgentHealthRouteHandler } from "./AgentHealthRouteHandler.js";
import { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import { AgentJsonResponseWriter } from "./AgentJsonResponseWriter.js";
import { AgentMcpRouteHandler } from "./AgentMcpRouteHandler.js";
import { AgentRequestAuthorizer } from "./AgentRequestAuthorizer.js";
import type { AgentRuntime } from "./AgentRuntime.js";
import { AgentWorkspaceRouteHandler } from "./AgentWorkspaceRouteHandler.js";
import type { McpToolService } from "./McpToolService.js";
import { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentHttpServer {
  private readonly authorizer: AgentRequestAuthorizer;
  private readonly jsonResponseWriter = new AgentJsonResponseWriter();
  private readonly requestReader = new AgentHttpRequestReader();
  private readonly chatStreamRouteHandler: AgentChatStreamRouteHandler;
  private readonly healthRouteHandler: AgentHealthRouteHandler;
  private readonly mcpRouteHandler: AgentMcpRouteHandler;
  private readonly workspaceRouteHandler: AgentWorkspaceRouteHandler;

  constructor(
    private readonly config: AgentConfig,
    private readonly runtime: AgentRuntime,
    private readonly workspaceManager = new WorkspaceManager(config.workspaceBasePath),
    private readonly mcpToolService?: McpToolService
  ) {
    this.authorizer = new AgentRequestAuthorizer(this.config);
    this.chatStreamRouteHandler = new AgentChatStreamRouteHandler(this.runtime);
    this.healthRouteHandler = new AgentHealthRouteHandler(this.runtime);
    this.mcpRouteHandler = new AgentMcpRouteHandler(this.mcpToolService, this.requestReader);
    this.workspaceRouteHandler = new AgentWorkspaceRouteHandler(this.workspaceManager, this.requestReader);
  }

  start(): void {
    const server = http.createServer((request, response) => {
      void this.route(request, response);
    });

    server.listen(this.config.port, this.config.host, () => {
      console.log(`advisor-ai-agent-ts listening on http://${this.config.host}:${this.config.port}`);
    });
  }

  private async route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
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
