import type { IncomingMessage } from "node:http";
import type { JsonObject } from "./JsonTypes.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceError } from "./WorkspaceError.js";

export class AgentHttpRequestReader {
  readWorkspaceScope(url: URL): { userId: number | null; sessionId: number | null } {
    return {
      userId: this.readNullableInt(url.searchParams.get("userId")),
      sessionId: this.readNullableInt(url.searchParams.get("sessionId"))
    };
  }

  async readJsonObject(request: IncomingMessage): Promise<Record<string, unknown>> {
    const body = await parseJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new WorkspaceError("请求体必须是 JSON 对象");
    }
    return body as Record<string, unknown>;
  }

  readRequiredString(body: Record<string, unknown>, key: string): string {
    const value = this.readAliasedValue(body, key);
    if (typeof value !== "string" || !value) {
      throw new WorkspaceError(`缺少必填字段: ${key}`);
    }
    return value;
  }

  readOptionalNumber(body: Record<string, unknown>, key: string, fallback: number): number {
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

  readOptionalBoolean(body: Record<string, unknown>, key: string, fallback: boolean): boolean {
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

  readOptionalJsonObject(body: Record<string, unknown>, key: string): JsonObject {
    const value = this.readAliasedValue(body, key);
    if (value === undefined || value === null) {
      return {};
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new WorkspaceError(`字段必须是 JSON 对象: ${key}`);
    }
    return value as JsonObject;
  }

  readBooleanQuery(value: string | null, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }
    return ["1", "true", "yes", "y"].includes(value.toLowerCase());
  }

  private readNullableInt(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private readAliasedValue(body: Record<string, unknown>, snakeKey: string): unknown {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return body[snakeKey] ?? body[camelKey];
  }
}
