import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import type { HttpRouteResult } from "./HttpRouteResult.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentWorkspaceReadRouteHandler {
  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/read") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const body = await this.requestReader.readJsonObject(request);
      const content = await this.workspaceManager.read(
        scope.userId,
        scope.sessionId,
        this.requestReader.readRequiredString(body, "path"),
        this.requestReader.readOptionalNumber(body, "offset", 0),
        this.requestReader.readOptionalNumber(body, "limit", 8192)
      );
      return { statusCode: 200, body: { status: "ok", content } };
    }

    if (method === "GET" && url.pathname === "/workspace/list") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const items = await this.workspaceManager.list(
        scope.userId,
        scope.sessionId,
        url.searchParams.get("path") || ".",
        this.requestReader.readBooleanQuery(url.searchParams.get("recursive"), false)
      );
      return { statusCode: 200, body: { status: "ok", items } };
    }

    return null;
  }
}
