import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../../../http/request/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../../../http/response/model/HttpRouteResult.js";
import type { WorkspaceManager } from "../../../core/WorkspaceManager.js";
import { AgentWorkspaceWriteRequestReader } from "../reader/AgentWorkspaceWriteRequestReader.js";

export class AgentWorkspaceWriteRouteHandler {
  private readonly writeRequestReader: AgentWorkspaceWriteRequestReader;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.writeRequestReader = new AgentWorkspaceWriteRequestReader(requestReader);
  }

  async handle(url: URL, request: IncomingMessage): Promise<HttpRouteResult> {
    const writeRequest = await this.writeRequestReader.read(url, request);
    const result = await this.workspaceManager.write(
      writeRequest.scope.userId,
      writeRequest.scope.sessionId,
      writeRequest.path,
      writeRequest.content,
      writeRequest.isFinal
    );
    return { statusCode: 200, body: { status: "ok", result } };
  }
}
