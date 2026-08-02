import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/response/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";
import { AgentWorkspaceEditRequestReader } from "./AgentWorkspaceEditRequestReader.js";

export class AgentWorkspaceEditRouteHandler {
  private readonly editRequestReader: AgentWorkspaceEditRequestReader;

  constructor(
    private readonly workspaceManager: WorkspaceManager,
    requestReader: AgentHttpRequestReader
  ) {
    this.editRequestReader = new AgentWorkspaceEditRequestReader(requestReader);
  }

  async handle(url: URL, request: IncomingMessage): Promise<HttpRouteResult> {
    const editRequest = await this.editRequestReader.read(url, request);
    const result = await this.workspaceManager.edit(
      editRequest.scope.userId,
      editRequest.scope.sessionId,
      editRequest.path,
      editRequest.oldString,
      editRequest.newString,
      editRequest.isFinal
    );
    return { statusCode: 200, body: { status: "ok", result } };
  }
}
