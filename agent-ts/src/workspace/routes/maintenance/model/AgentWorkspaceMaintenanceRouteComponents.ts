import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceCleanupRouteHandler } from "../operation/AgentWorkspaceCleanupRouteHandler.js";
import { AgentWorkspaceStatsRouteHandler } from "../operation/AgentWorkspaceStatsRouteHandler.js";

export class AgentWorkspaceMaintenanceRouteComponents {
  readonly cleanupRouteHandler: AgentWorkspaceCleanupRouteHandler;
  readonly statsRouteHandler: AgentWorkspaceStatsRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.cleanupRouteHandler = new AgentWorkspaceCleanupRouteHandler(workspaceManager, requestReader);
    this.statsRouteHandler = new AgentWorkspaceStatsRouteHandler(workspaceManager, requestReader);
  }
}
