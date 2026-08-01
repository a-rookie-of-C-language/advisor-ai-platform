import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AgentConfig } from "./AgentConfig.js";
import type { AgentRuntime } from "./AgentRuntime.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentHttpServer {
  constructor(
    private readonly config: AgentConfig,
    private readonly runtime: AgentRuntime,
    private readonly workspaceManager = new WorkspaceManager(config.workspaceBasePath)
  ) {}

  start(): void {
    const server = http.createServer((request, response) => {
      void this.route(request, response);
    });

    server.listen(this.config.port, this.config.host, () => {
      console.log(`advisor-ai-agent-ts listening on http://${this.config.host}:${this.config.port}`);
    });
  }

  private async route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
      if (request.method === "GET" && url.pathname === "/health") {
        this.writeJson(response, 200, { status: "ok", runtime: "typescript", core: await this.runtime.coreHealth() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/graph/health") {
        this.writeJson(response, 200, this.runtime.graphHealth());
        return;
      }

      if (!this.isAuthorized(request)) {
        this.writeJson(response, 401, { detail: "invalid agent token" });
        return;
      }

      if (request.method === "POST" && url.pathname === "/chat/stream") {
        const body = await parseJsonBody(request);
        await this.runtime.streamChat(body, request, response);
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/cleanup") {
        const scope = this.readWorkspaceScope(url);
        this.writeJson(response, 200, {
          status: "ok",
          cleaned: await this.workspaceManager.cleanupCache(scope.userId, scope.sessionId)
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/workspace/stats") {
        const scope = this.readWorkspaceScope(url);
        this.writeJson(response, 200, {
          status: "ok",
          stats: await this.workspaceManager.getStats(scope.userId, scope.sessionId)
        });
        return;
      }

      this.writeJson(response, 404, { detail: "not found" });
    } catch (error) {
      this.writeJson(response, 500, { detail: error instanceof Error ? error.message : "internal error" });
    }
  }

  private isAuthorized(request: IncomingMessage): boolean {
    if (!this.config.token) {
      return true;
    }
    const authorization = request.headers.authorization || "";
    const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    const agentToken = String(request.headers["x-agent-token"] || "").trim();
    return bearer === this.config.token || agentToken === this.config.token;
  }

  private writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
  }

  private readWorkspaceScope(url: URL): { userId: number | null; sessionId: number | null } {
    return {
      userId: this.readNullableInt(url.searchParams.get("userId")),
      sessionId: this.readNullableInt(url.searchParams.get("sessionId"))
    };
  }

  private readNullableInt(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
