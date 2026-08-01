import type { AgentHttpRequestReader } from "../../http/AgentHttpRequestReader.js";
import type { HttpRouteResult } from "../../http/HttpRouteResult.js";
import type { WorkspaceManager } from "../WorkspaceManager.js";

export class AgentWorkspaceListRouteHandler {
  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(url: URL): Promise<HttpRouteResult> {
    const scope = this.requestReader.readWorkspaceScope(url);
    const items = await this.workspaceManager.list(
      scope.userId,
      scope.sessionId,
      url.searchParams.get("path") || ".",
      this.requestReader.readBooleanQuery(url.searchParams.get("recursive"), false)
    );
    return { statusCode: 200, body: { status: "ok", items } };
  }
}
