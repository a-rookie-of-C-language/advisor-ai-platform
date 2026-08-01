import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import { AgentWorkspaceRouteComponents } from "./AgentWorkspaceRouteComponents.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

export class AgentWorkspaceRouteHandler {
  private readonly components: AgentWorkspaceRouteComponents;

  constructor(
    workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.components = new AgentWorkspaceRouteComponents(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    const maintenanceResult = await this.components.maintenanceRouteHandler.handle(method, url);
    if (maintenanceResult) {
      return maintenanceResult;
    }

    const readResult = await this.components.readRouteHandler.handle(method, url, request);
    if (readResult) {
      return readResult;
    }

    const mutationResult = await this.components.mutationRouteHandler.handle(method, url, request);
    if (mutationResult) {
      return mutationResult;
    }

    return null;
  }
}
