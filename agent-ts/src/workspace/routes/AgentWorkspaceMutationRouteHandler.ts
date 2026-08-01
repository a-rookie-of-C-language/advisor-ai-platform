import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceCreateDirRouteHandler } from "./AgentWorkspaceCreateDirRouteHandler.js";
import { AgentWorkspaceEditRouteHandler } from "./AgentWorkspaceEditRouteHandler.js";
import { AgentWorkspaceWriteRouteHandler } from "./AgentWorkspaceWriteRouteHandler.js";

export class AgentWorkspaceMutationRouteHandler {
  private readonly createDirRouteHandler: AgentWorkspaceCreateDirRouteHandler;
  private readonly editRouteHandler: AgentWorkspaceEditRouteHandler;
  private readonly writeRouteHandler: AgentWorkspaceWriteRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.createDirRouteHandler = new AgentWorkspaceCreateDirRouteHandler(workspaceManager, requestReader);
    this.editRouteHandler = new AgentWorkspaceEditRouteHandler(workspaceManager, requestReader);
    this.writeRouteHandler = new AgentWorkspaceWriteRouteHandler(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/write") {
      return this.writeRouteHandler.handle(url, request);
    }

    if (method === "POST" && url.pathname === "/workspace/edit") {
      return this.editRouteHandler.handle(url, request);
    }

    if (method === "POST" && url.pathname === "/workspace/create-dir") {
      return this.createDirRouteHandler.handle(url, request);
    }

    return null;
  }
}
