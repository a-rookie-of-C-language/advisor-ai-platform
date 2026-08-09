import type { AgentHttpRequestReader } from "../../../../http/request/reader/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceMutationRouteComponents } from "../model/AgentWorkspaceMutationRouteComponents.js";

export class AgentWorkspaceMutationRouteComponentsFactory {
  create(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader): AgentWorkspaceMutationRouteComponents {
    return new AgentWorkspaceMutationRouteComponents(workspaceManager, requestReader);
  }
}
