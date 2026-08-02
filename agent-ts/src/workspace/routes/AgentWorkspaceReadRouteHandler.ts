import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/response/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import type { AgentWorkspaceReadRouteComponents } from "./AgentWorkspaceReadRouteComponents.js";
import { AgentWorkspaceReadRouteComponentsFactory } from "./AgentWorkspaceReadRouteComponentsFactory.js";

export class AgentWorkspaceReadRouteHandler {
  private readonly components: AgentWorkspaceReadRouteComponents;
  private readonly componentsFactory = new AgentWorkspaceReadRouteComponentsFactory();

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.components = this.componentsFactory.create(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/read") {
      return this.components.fileReadRouteHandler.handle(url, request);
    }

    if (method === "GET" && url.pathname === "/workspace/list") {
      return this.components.listRouteHandler.handle(url);
    }

    return null;
  }
}
