import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AgentConfig } from "./AgentConfig.js";
import { AgentHealthRouteHandler } from "./AgentHealthRouteHandler.js";
import { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import { AgentMcpRouteHandler } from "./AgentMcpRouteHandler.js";
import { AgentRequestAuthorizer } from "./AgentRequestAuthorizer.js";
import type { AgentRuntime } from "./AgentRuntime.js";
import { AgentWorkspaceRouteHandler } from "./AgentWorkspaceRouteHandler.js";
import type { McpToolService } from "./McpToolService.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceError } from "./WorkspaceError.js";
import { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentHttpServer {
  private readonly authorizer: AgentRequestAuthorizer;
  private readonly requestReader = new AgentHttpRequestReader();
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
        this.writeJson(response, healthResult.statusCode, healthResult.body);
        return;
      }

      if (!this.authorizer.isAuthorized(request)) {
        this.writeJson(response, 401, { detail: "invalid agent token" });
        return;
      }

      if (request.method === "POST" && url.pathname === "/chat/stream") {
        const body = await parseJsonBody(request);
        await this.runtime.streamChat(body, request, response);
        return;
      }

      const workspaceResult = await this.workspaceRouteHandler.handle(request.method, url, request);
      if (workspaceResult) {
        this.writeJson(response, workspaceResult.statusCode, workspaceResult.body);
        return;
      }

      const mcpResult = await this.mcpRouteHandler.handle(request.method, url, request);
      if (mcpResult) {
        this.writeJson(response, mcpResult.statusCode, mcpResult.body);
        return;
      }

      this.writeJson(response, 404, { detail: "not found" });
    } catch (error) {
      this.writeJson(response, this.statusCodeForError(error), { detail: error instanceof Error ? error.message : "internal error" });
    }
  }

  private writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
  }

  private statusCodeForError(error: unknown): number {
    return error instanceof WorkspaceError ? 400 : 500;
  }
}
