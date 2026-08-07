import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceReadRouteComponents } from "../model/AgentWorkspaceReadRouteComponents.js";

export class AgentWorkspaceReadRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceReadRouteComponents {
    return new AgentWorkspaceReadRouteComponents(workspaceManager, requestReader);
  }
}
