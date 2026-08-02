import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentHttpRouter } from "./AgentHttpRouter.js";
import type { AgentRuntime } from "../app/AgentRuntime.js";
import { AgentHttpRouterFactory } from "./AgentHttpRouterFactory.js";
import type { McpToolService } from "../mcp/tools/McpToolService.js";
import type { WorkspaceManager } from "../workspace/WorkspaceManager.js";

export class AgentHttpServerComponents {
  readonly router: AgentHttpRouter;

  constructor(config: AgentConfig, runtime: AgentRuntime, workspaceManager: WorkspaceManager, mcpToolService?: McpToolService) {
    this.router = new AgentHttpRouterFactory().create(config, runtime, workspaceManager, mcpToolService);
  }
}
