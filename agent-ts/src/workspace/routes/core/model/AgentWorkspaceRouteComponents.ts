import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceMaintenanceRouteHandler } from "../../maintenance/core/AgentWorkspaceMaintenanceRouteHandler.js";
import { AgentWorkspaceMutationRouteHandler } from "../../mutation/core/AgentWorkspaceMutationRouteHandler.js";
import { AgentWorkspaceReadRouteHandler } from "../../read/core/AgentWorkspaceReadRouteHandler.js";

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
