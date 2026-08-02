import type { AgentHttpRequestReader } from "../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceCreateDirRouteHandler } from "./AgentWorkspaceCreateDirRouteHandler.js";
import { AgentWorkspaceEditRouteHandler } from "./AgentWorkspaceEditRouteHandler.js";
import { AgentWorkspaceWriteRouteHandler } from "./AgentWorkspaceWriteRouteHandler.js";

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
