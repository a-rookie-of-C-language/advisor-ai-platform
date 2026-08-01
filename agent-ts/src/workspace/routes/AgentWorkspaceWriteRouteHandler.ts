import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

export class AgentWorkspaceWriteRouteHandler {
  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(url: URL, request: IncomingMessage): Promise<HttpRouteResult> {
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
}
