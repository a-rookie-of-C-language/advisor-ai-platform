import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import type { AgentWorkspaceMaintenanceRouteComponents } from "../model/AgentWorkspaceMaintenanceRouteComponents.js";
import { AgentWorkspaceMaintenanceRouteComponentsFactory } from "../factory/AgentWorkspaceMaintenanceRouteComponentsFactory.js";

export class AgentWorkspaceMaintenanceRouteHandler {
  private readonly components: AgentWorkspaceMaintenanceRouteComponents;
  private readonly componentsFactory = new AgentWorkspaceMaintenanceRouteComponentsFactory();

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.components = this.componentsFactory.create(workspaceManager, requestReader);
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
