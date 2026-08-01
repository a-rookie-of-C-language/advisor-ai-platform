import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AgentConfig } from "./AgentConfig.js";
import { AgentHttpRequestReader } from "./AgentHttpRequestReader.js";
import type { AgentRuntime } from "./AgentRuntime.js";
import type { McpToolService } from "./McpToolService.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceError } from "./WorkspaceError.js";
import { WorkspaceManager } from "./WorkspaceManager.js";

export class AgentHttpServer {
  private readonly requestReader = new AgentHttpRequestReader();

  constructor(
    private readonly config: AgentConfig,
    private readonly runtime: AgentRuntime,
    private readonly workspaceManager = new WorkspaceManager(config.workspaceBasePath),
    private readonly mcpToolService?: McpToolService
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
        const scope = this.requestReader.readWorkspaceScope(url);
        this.writeJson(response, 200, {
          status: "ok",
          cleaned: await this.workspaceManager.cleanupCache(scope.userId, scope.sessionId)
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/workspace/stats") {
        const scope = this.requestReader.readWorkspaceScope(url);
        this.writeJson(response, 200, {
          status: "ok",
          stats: await this.workspaceManager.getStats(scope.userId, scope.sessionId)
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/read") {
        const scope = this.requestReader.readWorkspaceScope(url);
        const body = await this.requestReader.readJsonObject(request);
        const content = await this.workspaceManager.read(
          scope.userId,
          scope.sessionId,
          this.requestReader.readRequiredString(body, "path"),
          this.requestReader.readOptionalNumber(body, "offset", 0),
          this.requestReader.readOptionalNumber(body, "limit", 8192)
        );
        this.writeJson(response, 200, { status: "ok", content });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/write") {
        const scope = this.requestReader.readWorkspaceScope(url);
        const body = await this.requestReader.readJsonObject(request);
        const result = await this.workspaceManager.write(
          scope.userId,
          scope.sessionId,
          this.requestReader.readRequiredString(body, "path"),
          this.requestReader.readRequiredString(body, "content"),
          this.requestReader.readOptionalBoolean(body, "is_final", false)
        );
        this.writeJson(response, 200, { status: "ok", result });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/edit") {
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
        this.writeJson(response, 200, { status: "ok", result });
        return;
      }

      if (request.method === "GET" && url.pathname === "/workspace/list") {
        const scope = this.requestReader.readWorkspaceScope(url);
        const items = await this.workspaceManager.list(
          scope.userId,
          scope.sessionId,
          url.searchParams.get("path") || ".",
          this.requestReader.readBooleanQuery(url.searchParams.get("recursive"), false)
        );
        this.writeJson(response, 200, { status: "ok", items });
        return;
      }

      if (request.method === "POST" && url.pathname === "/workspace/create-dir") {
        const scope = this.requestReader.readWorkspaceScope(url);
        const body = await this.requestReader.readJsonObject(request);
        const result = await this.workspaceManager.createDir(
          scope.userId,
          scope.sessionId,
          this.requestReader.readRequiredString(body, "path"),
          this.requestReader.readOptionalBoolean(body, "is_final", false)
        );
        this.writeJson(response, 200, { status: "ok", result });
        return;
      }

      if (request.method === "GET" && url.pathname === "/mcp/tools") {
        const mcpToolService = this.requireMcpToolService();
        this.writeJson(response, 200, { status: "ok", tools: await mcpToolService.listTools() });
        return;
      }

      if (request.method === "POST" && url.pathname === "/mcp/call") {
        const mcpToolService = this.requireMcpToolService();
        const body = await this.requestReader.readJsonObject(request);
        const result = await mcpToolService.callTool(
          this.requestReader.readRequiredString(body, "server"),
          this.requestReader.readRequiredString(body, "name"),
          this.requestReader.readOptionalJsonObject(body, "arguments")
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

  private statusCodeForError(error: unknown): number {
    return error instanceof WorkspaceError ? 400 : 500;
  }

  private requireMcpToolService(): McpToolService {
    if (!this.mcpToolService) {
      throw new WorkspaceError("MCP tools 未启用");
    }
    return this.mcpToolService;
  }
}
