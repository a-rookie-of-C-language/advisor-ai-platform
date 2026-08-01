import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceReadRouteComponents } from "./AgentWorkspaceReadRouteComponents.js";

export class AgentWorkspaceReadRouteHandler {
  private readonly components: AgentWorkspaceReadRouteComponents;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.components = new AgentWorkspaceReadRouteComponents(workspaceManager, requestReader);
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
