import type { AgentHttpRequestReader } from "../../../../http/request/reader/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceMaintenanceRouteComponents } from "../model/AgentWorkspaceMaintenanceRouteComponents.js";

export class AgentWorkspaceMaintenanceRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceMaintenanceRouteComponents {
    return new AgentWorkspaceMaintenanceRouteComponents(workspaceManager, requestReader);
  }
}
