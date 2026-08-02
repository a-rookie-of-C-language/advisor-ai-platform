import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceReadRouteComponents } from "./AgentWorkspaceReadRouteComponents.js";

export class AgentWorkspaceReadRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceReadRouteComponents {
    return new AgentWorkspaceReadRouteComponents(workspaceManager, requestReader);
  }
}
