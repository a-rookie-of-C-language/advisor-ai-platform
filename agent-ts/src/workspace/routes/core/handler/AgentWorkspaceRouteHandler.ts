import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceRouteComponentsFactory } from "../factory/AgentWorkspaceRouteComponentsFactory.js";
import { AgentWorkspaceRouteDispatcher } from "../dispatch/AgentWorkspaceRouteDispatcher.js";

export class AgentWorkspaceRouteHandler {
  private readonly componentsFactory = new AgentWorkspaceRouteComponentsFactory();
  private readonly dispatcher: AgentWorkspaceRouteDispatcher;

  constructor(
    workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.dispatcher = new AgentWorkspaceRouteDispatcher(this.componentsFactory.create(workspaceManager, requestReader));
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    return this.dispatcher.dispatch(method, url, request);
  }
}
