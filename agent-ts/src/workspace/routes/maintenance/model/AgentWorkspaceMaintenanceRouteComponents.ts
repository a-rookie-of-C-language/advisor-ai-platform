import type { AgentHttpRequestReader } from "../../../../http/request/reader/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceCleanupRouteHandler } from "../operation/cleanup/AgentWorkspaceCleanupRouteHandler.js";
import { AgentWorkspaceStatsRouteHandler } from "../operation/stats/AgentWorkspaceStatsRouteHandler.js";

export class AgentWorkspaceMaintenanceRouteComponents {
  readonly cleanupRouteHandler: AgentWorkspaceCleanupRouteHandler;
  readonly statsRouteHandler: AgentWorkspaceStatsRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.cleanupRouteHandler = new AgentWorkspaceCleanupRouteHandler(workspaceManager, requestReader);
    this.statsRouteHandler = new AgentWorkspaceStatsRouteHandler(workspaceManager, requestReader);
  }
}
