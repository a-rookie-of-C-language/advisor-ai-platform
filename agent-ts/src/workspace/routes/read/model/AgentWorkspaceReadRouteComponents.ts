import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceFileReadRouteHandler } from "../operation/AgentWorkspaceFileReadRouteHandler.js";
import { AgentWorkspaceListRouteHandler } from "../operation/AgentWorkspaceListRouteHandler.js";

export class AgentWorkspaceReadRouteComponents {
  readonly fileReadRouteHandler: AgentWorkspaceFileReadRouteHandler;
  readonly listRouteHandler: AgentWorkspaceListRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.fileReadRouteHandler = new AgentWorkspaceFileReadRouteHandler(workspaceManager, requestReader);
    this.listRouteHandler = new AgentWorkspaceListRouteHandler(workspaceManager, requestReader);
  }
}
