import type { AgentRuntime } from "../../app/runtime/core/AgentRuntime.js";
import type { AgentConfig } from "../../config/model/AgentConfig.js";
import type { McpToolService } from "../../mcp/tools/core/McpToolService.js";
import type { WorkspaceManager } from "../../workspace/core/WorkspaceManager.js";
import { AgentHttpRouter } from "../router/AgentHttpRouter.js";
import { AgentHttpRouterFactory } from "../router/AgentHttpRouterFactory.js";

export class AgentHttpServerComponents {
  readonly router: AgentHttpRouter;

  constructor(config: AgentConfig, runtime: AgentRuntime, workspaceManager: WorkspaceManager, mcpToolService?: McpToolService) {
    this.router = new AgentHttpRouterFactory().create(config, runtime, workspaceManager, mcpToolService);
  }
}
