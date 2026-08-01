import type { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import type { HttpRouteResult } from "./HttpRouteResult.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentWorkspaceMaintenanceRouteHandler {
  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(method: string | undefined, url: URL): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/cleanup") {
      const scope = this.requestReader.readWorkspaceScope(url);
      return {
        statusCode: 200,
        body: {
          status: "ok",
          cleaned: await this.workspaceManager.cleanupCache(scope.userId, scope.sessionId)
        }
      };
    }

    if (method === "GET" && url.pathname === "/workspace/stats") {
      const scope = this.requestReader.readWorkspaceScope(url);
      return {
        statusCode: 200,
        body: {
          status: "ok",
          stats: await this.workspaceManager.getStats(scope.userId, scope.sessionId)
        }
      };
    }

    return null;
  }
}
