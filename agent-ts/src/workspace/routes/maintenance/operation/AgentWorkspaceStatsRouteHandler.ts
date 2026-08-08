import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceScopedRouteRequestReader } from "../reader/AgentWorkspaceScopedRouteRequestReader.js";

export class AgentWorkspaceStatsRouteHandler {
  private readonly scopedRequestReader: AgentWorkspaceScopedRouteRequestReader;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.scopedRequestReader = new AgentWorkspaceScopedRouteRequestReader(requestReader);
  }

  async handle(url: URL): Promise<HttpRouteResult> {
    const scopedRequest = this.scopedRequestReader.read(url);
    return {
      statusCode: 200,
      body: {
        status: "ok",
        stats: await this.workspaceManager.getStats(scopedRequest.scope.userId, scopedRequest.scope.sessionId)
      }
    };
  }
}
