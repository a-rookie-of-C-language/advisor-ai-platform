import type { AgentRuntime } from "../app/AgentRuntime.js";
import type { AgentConfig } from "../config/AgentConfig.js";
import type { McpToolService } from "../mcp/McpToolService.js";
import type { WorkspaceManager } from "../workspace/WorkspaceManager.js";
import { AgentWorkspaceRouteHandler } from "../workspace/routes/AgentWorkspaceRouteHandler.js";
import { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import { AgentHttpRouter } from "./AgentHttpRouter.js";
import { AgentJsonResponseWriter } from "./AgentJsonResponseWriter.js";
import { AgentRequestAuthorizer } from "./AgentRequestAuthorizer.js";
import { AgentRequestUrlFactory } from "./AgentRequestUrlFactory.js";
import { AgentChatStreamRouteHandler } from "./routes/AgentChatStreamRouteHandler.js";
import { AgentHealthRouteHandler } from "./routes/AgentHealthRouteHandler.js";
import { AgentMcpRouteHandler } from "./routes/AgentMcpRouteHandler.js";

export class AgentHttpRouterFactory {
  create(
    config: AgentConfig,
    runtime: AgentRuntime,
    workspaceManager: WorkspaceManager,
    mcpToolService?: McpToolService
  ): AgentHttpRouter {
    const requestReader = new AgentHttpRequestReader();
    return new AgentHttpRouter(
      new AgentRequestAuthorizer(config),
      new AgentChatStreamRouteHandler(runtime),
      new AgentHealthRouteHandler(runtime),
      new AgentJsonResponseWriter(),
      new AgentMcpRouteHandler(mcpToolService, requestReader),
      new AgentRequestUrlFactory(),
      new AgentWorkspaceRouteHandler(workspaceManager, requestReader)
    );
  }
}
