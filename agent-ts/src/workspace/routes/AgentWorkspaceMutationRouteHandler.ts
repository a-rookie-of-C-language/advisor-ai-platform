import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceMutationRouteComponents } from "./AgentWorkspaceMutationRouteComponents.js";

export class AgentWorkspaceMutationRouteHandler {
  private readonly components: AgentWorkspaceMutationRouteComponents;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.components = new AgentWorkspaceMutationRouteComponents(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/write") {
      return this.components.writeRouteHandler.handle(url, request);
    }

    if (method === "POST" && url.pathname === "/workspace/edit") {
      return this.components.editRouteHandler.handle(url, request);
    }

    if (method === "POST" && url.pathname === "/workspace/create-dir") {
      return this.components.createDirRouteHandler.handle(url, request);
    }

    return null;
  }
}
