import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import { AgentWorkspaceRouteComponentsFactory } from "./AgentWorkspaceRouteComponentsFactory.js";
import { AgentWorkspaceRouteDispatcher } from "./AgentWorkspaceRouteDispatcher.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

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
