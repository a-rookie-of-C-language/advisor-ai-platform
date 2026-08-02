import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceMaintenanceRouteComponents } from "./AgentWorkspaceMaintenanceRouteComponents.js";

export class AgentWorkspaceMaintenanceRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceMaintenanceRouteComponents {
    return new AgentWorkspaceMaintenanceRouteComponents(workspaceManager, requestReader);
  }
}
