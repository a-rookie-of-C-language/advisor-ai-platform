import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import { AgentWorkspaceMaintenanceRouteHandler } from "./AgentWorkspaceMaintenanceRouteHandler.js";
import { AgentWorkspaceMutationRouteHandler } from "./AgentWorkspaceMutationRouteHandler.js";
import { AgentWorkspaceReadRouteHandler } from "./AgentWorkspaceReadRouteHandler.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

export class AgentWorkspaceRouteHandler {
  private readonly maintenanceRouteHandler: AgentWorkspaceMaintenanceRouteHandler;
  private readonly mutationRouteHandler: AgentWorkspaceMutationRouteHandler;
  private readonly readRouteHandler: AgentWorkspaceReadRouteHandler;

  constructor(
    workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.maintenanceRouteHandler = new AgentWorkspaceMaintenanceRouteHandler(workspaceManager, requestReader);
    this.mutationRouteHandler = new AgentWorkspaceMutationRouteHandler(workspaceManager, requestReader);
    this.readRouteHandler = new AgentWorkspaceReadRouteHandler(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    const maintenanceResult = await this.maintenanceRouteHandler.handle(method, url);
    if (maintenanceResult) {
      return maintenanceResult;
    }

    const readResult = await this.readRouteHandler.handle(method, url, request);
    if (readResult) {
      return readResult;
    }

    const mutationResult = await this.mutationRouteHandler.handle(method, url, request);
    if (mutationResult) {
      return mutationResult;
    }

    return null;
  }
}
