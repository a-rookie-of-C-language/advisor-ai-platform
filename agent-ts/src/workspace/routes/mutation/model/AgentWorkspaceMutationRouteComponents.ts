import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceCreateDirRouteHandler } from "../operation/AgentWorkspaceCreateDirRouteHandler.js";
import { AgentWorkspaceEditRouteHandler } from "../operation/AgentWorkspaceEditRouteHandler.js";
import { AgentWorkspaceWriteRouteHandler } from "../operation/AgentWorkspaceWriteRouteHandler.js";

export class AgentWorkspaceMutationRouteComponents {
  readonly createDirRouteHandler: AgentWorkspaceCreateDirRouteHandler;
  readonly editRouteHandler: AgentWorkspaceEditRouteHandler;
  readonly writeRouteHandler: AgentWorkspaceWriteRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.createDirRouteHandler = new AgentWorkspaceCreateDirRouteHandler(workspaceManager, requestReader);
    this.editRouteHandler = new AgentWorkspaceEditRouteHandler(workspaceManager, requestReader);
    this.writeRouteHandler = new AgentWorkspaceWriteRouteHandler(workspaceManager, requestReader);
  }
}
