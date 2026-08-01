import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import { AgentWorkspaceMaintenanceRouteHandler } from "./AgentWorkspaceMaintenanceRouteHandler.js";
import { AgentWorkspaceReadRouteHandler } from "./AgentWorkspaceReadRouteHandler.js";
import type { HttpRouteResult } from "./HttpRouteResult.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentWorkspaceRouteHandler {
  private readonly maintenanceRouteHandler: AgentWorkspaceMaintenanceRouteHandler;
  private readonly readRouteHandler: AgentWorkspaceReadRouteHandler;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {
    this.maintenanceRouteHandler = new AgentWorkspaceMaintenanceRouteHandler(workspaceManager, requestReader);
    this.readRouteHandler = new AgentWorkspaceReadRouteHandler(workspaceManager, requestReader);
  }

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    const maintenanceResult = await this.maintenanceRouteHandler.handle(method, url);
    if (maintenanceResult) {
      return maintenanceResult;
    }

    const readResult = await this.readRouteHandler.handle(method, url, request);
    if (readResult) {
      return readResult;
    }

    if (method === "POST" && url.pathname === "/workspace/write") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const body = await this.requestReader.readJsonObject(request);
      const result = await this.workspaceManager.write(
        scope.userId,
        scope.sessionId,
        this.requestReader.readRequiredString(body, "path"),
        this.requestReader.readRequiredString(body, "content"),
        this.requestReader.readOptionalBoolean(body, "is_final", false)
      );
      return { statusCode: 200, body: { status: "ok", result } };
    }

    if (method === "POST" && url.pathname === "/workspace/edit") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const body = await this.requestReader.readJsonObject(request);
      const result = await this.workspaceManager.edit(
        scope.userId,
        scope.sessionId,
        this.requestReader.readRequiredString(body, "path"),
        this.requestReader.readRequiredString(body, "old_string"),
        this.requestReader.readRequiredString(body, "new_string"),
        this.requestReader.readOptionalBoolean(body, "is_final", false)
      );
      return { statusCode: 200, body: { status: "ok", result } };
    }

    if (method === "POST" && url.pathname === "/workspace/create-dir") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const body = await this.requestReader.readJsonObject(request);
      const result = await this.workspaceManager.createDir(
        scope.userId,
        scope.sessionId,
        this.requestReader.readRequiredString(body, "path"),
        this.requestReader.readOptionalBoolean(body, "is_final", false)
      );
      return { statusCode: 200, body: { status: "ok", result } };
    }

    return null;
  }
}
