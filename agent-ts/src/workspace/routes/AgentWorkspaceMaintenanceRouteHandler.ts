import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceMaintenanceRouteComponents } from "./AgentWorkspaceMaintenanceRouteComponents.js";

export class AgentWorkspaceMaintenanceRouteHandler {
  private readonly components: AgentWorkspaceMaintenanceRouteComponents;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.components = new AgentWorkspaceMaintenanceRouteComponents(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/cleanup") {
      return this.components.cleanupRouteHandler.handle(url);
    }

    if (method === "GET" && url.pathname === "/workspace/stats") {
      return this.components.statsRouteHandler.handle(url);
    }

    return null;
  }
}
