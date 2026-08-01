import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

export class AgentWorkspaceStatsRouteHandler {
  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(url: URL): Promise<HttpRouteResult> {
    const scope = this.requestReader.readWorkspaceScope(url);
    return {
      statusCode: 200,
      body: {
        status: "ok",
        stats: await this.workspaceManager.getStats(scope.userId, scope.sessionId)
      }
    };
  }
}
