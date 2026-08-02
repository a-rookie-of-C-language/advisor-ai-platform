import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceMutationRouteComponents } from "./AgentWorkspaceMutationRouteComponents.js";

export class AgentWorkspaceMutationRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceMutationRouteComponents {
    return new AgentWorkspaceMutationRouteComponents(workspaceManager, requestReader);
  }
}
