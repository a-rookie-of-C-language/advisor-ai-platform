import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceRouteComponents } from "../model/AgentWorkspaceRouteComponents.js";

export class AgentWorkspaceRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceRouteComponents {
    return new AgentWorkspaceRouteComponents(workspaceManager, requestReader);
  }
}
