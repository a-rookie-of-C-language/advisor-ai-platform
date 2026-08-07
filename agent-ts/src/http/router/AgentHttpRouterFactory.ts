import type { AgentRuntime } from "../../app/runtime/core/AgentRuntime.js";
import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { McpToolService } from "../../mcp/tools/core/McpToolService.js";
import type { WorkspaceManager } from "../../workspace/core/WorkspaceManager.js";
import { AgentWorkspaceRouteHandler } from "../../workspace/routes/core/AgentWorkspaceRouteHandler.js";
import { AgentHttpRequestReader } from "../request/AgentHttpRequestReader.js";
import { AgentRequestUrlFactory } from "../request/AgentRequestUrlFactory.js";
import { AgentJsonResponseWriter } from "../response/AgentJsonResponseWriter.js";
import { AgentChatStreamRouteHandler } from "../routes/AgentChatStreamRouteHandler.js";
import { AgentHealthRouteHandler } from "../routes/AgentHealthRouteHandler.js";
import { AgentMcpRouteHandler } from "../routes/AgentMcpRouteHandler.js";
import { AgentHttpRouter } from "./AgentHttpRouter.js";
import { AgentRequestAuthorizer } from "./AgentRequestAuthorizer.js";

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
