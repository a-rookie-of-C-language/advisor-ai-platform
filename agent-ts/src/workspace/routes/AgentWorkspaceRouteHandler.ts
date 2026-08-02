import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import { AgentWorkspaceRouteComponents } from "./AgentWorkspaceRouteComponents.js";
import { AgentWorkspaceRouteDispatcher } from "./AgentWorkspaceRouteDispatcher.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

export class AgentWorkspaceRouteHandler {
  private readonly dispatcher: AgentWorkspaceRouteDispatcher;

  constructor(
    workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.dispatcher = new AgentWorkspaceRouteDispatcher(new AgentWorkspaceRouteComponents(workspaceManager, requestReader));
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    return this.dispatcher.dispatch(method, url, request);
  }
}
