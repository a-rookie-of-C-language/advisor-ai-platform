import http from "node:http";
import type { AgentConfig } from "../config/AgentConfig.js";
import { AgentHttpServerComponents } from "./AgentHttpServerComponents.js";
import type { AgentRuntime } from "../app/AgentRuntime.js";
import type { McpToolService } from "../mcp/tools/McpToolService.js";
import { WorkspaceManager } from "../workspace/WorkspaceManager.js";

export class AgentHttpServer {
  private readonly components: AgentHttpServerComponents;

  constructor(
    private readonly config: AgentConfig,
    private readonly runtime: AgentRuntime,
    private readonly workspaceManager = new WorkspaceManager(config.workspaceBasePath),
    private readonly mcpToolService?: McpToolService
  ) {
    this.components = new AgentHttpServerComponents(this.config, this.runtime, this.workspaceManager, this.mcpToolService);
  }

  start(): void {
    const server = http.createServer((request, response) => {
      void this.components.router.route(request, response);
    });

    server.listen(this.config.port, this.config.host, () => {
      console.log(`advisor-ai-agent-ts listening on http://${this.config.host}:${this.config.port}`);
    });
  }
}
