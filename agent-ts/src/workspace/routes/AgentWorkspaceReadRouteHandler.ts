import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceFileReadRouteHandler } from "./AgentWorkspaceFileReadRouteHandler.js";
import { AgentWorkspaceListRouteHandler } from "./AgentWorkspaceListRouteHandler.js";

export class AgentWorkspaceReadRouteHandler {
  private readonly fileReadRouteHandler: AgentWorkspaceFileReadRouteHandler;
  private readonly listRouteHandler: AgentWorkspaceListRouteHandler;

  constructor(workspaceManager: WorkspaceManager, requestReader: AgentHttpRequestReader) {
    this.fileReadRouteHandler = new AgentWorkspaceFileReadRouteHandler(workspaceManager, requestReader);
    this.listRouteHandler = new AgentWorkspaceListRouteHandler(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/read") {
      return this.fileReadRouteHandler.handle(url, request);
    }

    if (method === "GET" && url.pathname === "/workspace/list") {
      return this.listRouteHandler.handle(url);
    }

    return null;
  }
}
