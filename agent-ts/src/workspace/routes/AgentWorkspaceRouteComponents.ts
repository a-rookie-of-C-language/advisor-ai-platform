import type { AgentHttpRequestReader } from "../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../core/WorkspaceManager.js";
import { AgentWorkspaceMaintenanceRouteHandler } from "./AgentWorkspaceMaintenanceRouteHandler.js";
import { AgentWorkspaceMutationRouteHandler } from "./AgentWorkspaceMutationRouteHandler.js";
import { AgentWorkspaceReadRouteHandler } from "./AgentWorkspaceReadRouteHandler.js";

export class AgentWorkspaceRouteComponents {
  readonly maintenanceRouteHandler: AgentWorkspaceMaintenanceRouteHandler;
  readonly mutationRouteHandler: AgentWorkspaceMutationRouteHandler;
  readonly readRouteHandler: AgentWorkspaceReadRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.maintenanceRouteHandler = new AgentWorkspaceMaintenanceRouteHandler(workspaceManager, requestReader);
    this.mutationRouteHandler = new AgentWorkspaceMutationRouteHandler(workspaceManager, requestReader);
    this.readRouteHandler = new AgentWorkspaceReadRouteHandler(workspaceManager, requestReader);
  }
}
