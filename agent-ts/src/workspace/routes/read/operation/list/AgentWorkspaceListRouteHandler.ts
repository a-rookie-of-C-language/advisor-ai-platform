import type { AgentHttpRequestReader } from "../../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../../core/manager/WorkspaceManager.js";
import { AgentWorkspaceListRequestReader } from "../../reader/list/AgentWorkspaceListRequestReader.js";

export class AgentWorkspaceListRouteHandler {
  private readonly listRequestReader: AgentWorkspaceListRequestReader;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.listRequestReader = new AgentWorkspaceListRequestReader(requestReader);
  }

  async handle(url: URL): Promise<HttpRouteResult> {
    const listRequest = this.listRequestReader.read(url);
    const items = await this.workspaceManager.list(
      listRequest.scope.userId,
      listRequest.scope.sessionId,
      listRequest.path,
      listRequest.recursive
    );
    return { statusCode: 200, body: { status: "ok", items } };
  }
}
