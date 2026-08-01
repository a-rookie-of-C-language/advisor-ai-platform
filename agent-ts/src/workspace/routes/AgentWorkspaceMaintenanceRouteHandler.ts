import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceCleanupRouteHandler } from "./AgentWorkspaceCleanupRouteHandler.js";
import { AgentWorkspaceStatsRouteHandler } from "./AgentWorkspaceStatsRouteHandler.js";

export class AgentWorkspaceMaintenanceRouteHandler {
  private readonly cleanupRouteHandler: AgentWorkspaceCleanupRouteHandler;
  private readonly statsRouteHandler: AgentWorkspaceStatsRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.cleanupRouteHandler = new AgentWorkspaceCleanupRouteHandler(workspaceManager, requestReader);
    this.statsRouteHandler = new AgentWorkspaceStatsRouteHandler(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/cleanup") {
      return this.cleanupRouteHandler.handle(url);
    }

    if (method === "GET" && url.pathname === "/workspace/stats") {
      return this.statsRouteHandler.handle(url);
    }

    return null;
  }
}
