import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceFileReadRequestReader } from "../reader/AgentWorkspaceFileReadRequestReader.js";

export class AgentWorkspaceFileReadRouteHandler {
  private readonly fileReadRequestReader: AgentWorkspaceFileReadRequestReader;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.fileReadRequestReader = new AgentWorkspaceFileReadRequestReader(requestReader);
  }

  async handle(url: URL, request: IncomingMessage): Promise<HttpRouteResult> {
    const readRequest = await this.fileReadRequestReader.read(url, request);
    const content = await this.workspaceManager.read(
      readRequest.scope.userId,
      readRequest.scope.sessionId,
      readRequest.path,
      readRequest.offset,
      readRequest.limit
    );
    return { statusCode: 200, body: { status: "ok", content } };
  }
}
