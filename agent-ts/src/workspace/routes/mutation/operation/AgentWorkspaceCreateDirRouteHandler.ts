import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceCreateDirRequestReader } from "../reader/directory/AgentWorkspaceCreateDirRequestReader.js";

export class AgentWorkspaceCreateDirRouteHandler {
  private readonly createDirRequestReader: AgentWorkspaceCreateDirRequestReader;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.createDirRequestReader = new AgentWorkspaceCreateDirRequestReader(requestReader);
  }

  async handle(url: URL, request: IncomingMessage): Promise<HttpRouteResult> {
    const createDirRequest = await this.createDirRequestReader.read(url, request);
    const result = await this.workspaceManager.createDir(
      createDirRequest.scope.userId,
      createDirRequest.scope.sessionId,
      createDirRequest.path,
      createDirRequest.isFinal
    );
    return { statusCode: 200, body: { status: "ok", result } };
  }
}
