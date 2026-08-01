import type { IncomingMessage } from "node:http";
import type { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import type { HttpRouteResult } from "./HttpRouteResult.js";
import type { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentWorkspaceRouteHandler {
  constructor(
    private readonly workspaceManager: WorkspaceManager,
    private readonly requestReader: AgentHttpRequestReader
  ) {}

  async handle(method: string | undefined, url: URL, request: IncomingMessage): Promise<HttpRouteResult | null> {
    if (method === "POST" && url.pathname === "/workspace/cleanup") {
      const scope = this.requestReader.readWorkspaceScope(url);
      return {
        statusCode: 200,
        body: {
          status: "ok",
          cleaned: await this.workspaceManager.cleanupCache(scope.userId, scope.sessionId)
        }
      };
    }

    if (method === "GET" && url.pathname === "/workspace/stats") {
      const scope = this.requestReader.readWorkspaceScope(url);
      return {
        statusCode: 200,
        body: {
          status: "ok",
          stats: await this.workspaceManager.getStats(scope.userId, scope.sessionId)
        }
      };
    }

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

    if (method === "POST" && url.pathname === "/workspace/write") {
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

    if (method === "POST" && url.pathname === "/workspace/edit") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const body = await this.requestReader.readJsonObject(request);
      const result = await this.workspaceManager.edit(
        scope.userId,
        scope.sessionId,
        this.requestReader.readRequiredString(body, "path"),
        this.requestReader.readRequiredString(body, "old_string"),
        this.requestReader.readRequiredString(body, "new_string"),
        this.requestReader.readOptionalBoolean(body, "is_final", false)
      );
      return { statusCode: 200, body: { status: "ok", result } };
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

    if (method === "POST" && url.pathname === "/workspace/create-dir") {
      const scope = this.requestReader.readWorkspaceScope(url);
      const body = await this.requestReader.readJsonObject(request);
      const result = await this.workspaceManager.createDir(
        scope.userId,
        scope.sessionId,
        this.requestReader.readRequiredString(body, "path"),
        this.requestReader.readOptionalBoolean(body, "is_final", false)
      );
      return { statusCode: 200, body: { status: "ok", result } };
    }

    return null;
  }
}
