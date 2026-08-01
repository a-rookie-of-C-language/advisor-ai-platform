import http from "node:http";
import { AgentChatStreamRouteHandler } from "./routes/AgentChatStreamRouteHandler.js";
import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentHealthRouteHandler } from "./routes/AgentHealthRouteHandler.js";
import { AgentHttpRouter } from "./AgentHttpRouter.js";
import { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import { AgentJsonResponseWriter } from "./AgentJsonResponseWriter.js";
import { AgentMcpRouteHandler } from "./routes/AgentMcpRouteHandler.js";
import { AgentRequestAuthorizer } from "./AgentRequestAuthorizer.js";
import { AgentRequestUrlFactory } from "./AgentRequestUrlFactory.js";
import type { AgentRuntime } from "../app/AgentRuntime.js";
import { AgentWorkspaceRouteHandler } from "../workspace/routes/AgentWorkspaceRouteHandler.js";
import type { McpToolService } from "../mcp/McpToolService.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";

export class AgentHttpServer {
  private readonly authorizer: AgentRequestAuthorizer;
  private readonly jsonResponseWriter = new AgentJsonResponseWriter();
  private readonly requestReader = new AgentHttpRequestReader();
  private readonly requestUrlFactory = new AgentRequestUrlFactory();
  private readonly chatStreamRouteHandler: AgentChatStreamRouteHandler;
  private readonly healthRouteHandler: AgentHealthRouteHandler;
  private readonly mcpRouteHandler: AgentMcpRouteHandler;
  private readonly router: AgentHttpRouter;
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
    this.router = new AgentHttpRouter(
      this.authorizer,
      this.chatStreamRouteHandler,
      this.healthRouteHandler,
      this.jsonResponseWriter,
      this.mcpRouteHandler,
      this.requestUrlFactory,
      this.workspaceRouteHandler
    );
  }

  start(): void {
    const server = http.createServer((request, response) => {
      void this.router.route(request, response);
    });

    server.listen(this.config.port, this.config.host, () => {
      console.log(`advisor-ai-agent-ts listening on http://${this.config.host}:${this.config.port}`);
    });
  }
}
