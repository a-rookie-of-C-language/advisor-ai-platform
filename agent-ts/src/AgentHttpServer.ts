import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AgentConfig } from "./AgentConfig.js";
import type { AgentRuntime } from "./AgentRuntime.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceError } from "./WorkspaceError.js";
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

      if (request.method === "POST" && url.pathname === "/workspace/read") {
        const scope = this.readWorkspaceScope(url);
        const body = await this.readJsonObject(request);
        const content = await this.workspaceManager.read(
          scope.userId,
          scope.sessionId,
          this.readRequiredString(body, "path"),
          this.readOptionalNumber(body, "offset", 0),
          this.readOptionalNumber(body, "limit", 8192)
        );
        this.writeJson(response, 200, { status: "ok", content });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/write") {
        const scope = this.readWorkspaceScope(url);
        const body = await this.readJsonObject(request);
        const result = await this.workspaceManager.write(
          scope.userId,
          scope.sessionId,
          this.readRequiredString(body, "path"),
          this.readRequiredString(body, "content"),
          this.readOptionalBoolean(body, "is_final", false)
        );
        this.writeJson(response, 200, { status: "ok", result });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/edit") {
        const scope = this.readWorkspaceScope(url);
        const body = await this.readJsonObject(request);
        const result = await this.workspaceManager.edit(
          scope.userId,
          scope.sessionId,
          this.readRequiredString(body, "path"),
          this.readRequiredString(body, "old_string"),
          this.readRequiredString(body, "new_string"),
          this.readOptionalBoolean(body, "is_final", false)
        );
        this.writeJson(response, 200, { status: "ok", result });
        return;
      }

      if (request.method === "GET" && url.pathname === "/workspace/list") {
        const scope = this.readWorkspaceScope(url);
        const items = await this.workspaceManager.list(
          scope.userId,
          scope.sessionId,
          url.searchParams.get("path") || ".",
          this.readBooleanQuery(url.searchParams.get("recursive"), false)
        );
        this.writeJson(response, 200, { status: "ok", items });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/create-dir") {
        const scope = this.readWorkspaceScope(url);
        const body = await this.readJsonObject(request);
        const result = await this.workspaceManager.createDir(
          scope.userId,
          scope.sessionId,
          this.readRequiredString(body, "path"),
          this.readOptionalBoolean(body, "is_final", false)
        );
        this.writeJson(response, 200, { status: "ok", result });
        return;
      }

      this.writeJson(response, 404, { detail: "not found" });
    } catch (error) {
      this.writeJson(response, this.statusCodeForError(error), { detail: error instanceof Error ? error.message : "internal error" });
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

  private async readJsonObject(request: IncomingMessage): Promise<Record<string, unknown>> {
    const body = await parseJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new WorkspaceError("请求体必须是 JSON 对象");
    }
    return body as Record<string, unknown>;
  }

  private readRequiredString(body: Record<string, unknown>, key: string): string {
    const value = this.readAliasedValue(body, key);
    if (typeof value !== "string" || !value) {
      throw new WorkspaceError(`缺少必填字段: ${key}`);
    }
    return value;
  }

  private readOptionalNumber(body: Record<string, unknown>, key: string, fallback: number): number {
    const value = this.readAliasedValue(body, key);
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) {
      throw new WorkspaceError(`字段必须是数字: ${key}`);
    }
    return parsed;
  }

  private readOptionalBoolean(body: Record<string, unknown>, key: string, fallback: boolean): boolean {
    const value = this.readAliasedValue(body, key);
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return this.readBooleanQuery(value, fallback);
    }
    throw new WorkspaceError(`字段必须是布尔值: ${key}`);
  }

  private readAliasedValue(body: Record<string, unknown>, snakeKey: string): unknown {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return body[snakeKey] ?? body[camelKey];
  }

  private readBooleanQuery(value: string | null, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }
    return ["1", "true", "yes", "y"].includes(value.toLowerCase());
  }

  private statusCodeForError(error: unknown): number {
    return error instanceof WorkspaceError ? 400 : 500;
  }
}
