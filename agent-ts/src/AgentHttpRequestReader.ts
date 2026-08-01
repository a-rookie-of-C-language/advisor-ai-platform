import type { IncomingMessage } from "node:http";
import { AgentHttpFieldReader } from "./AgentHttpFieldReader.js";
import type { JsonObject } from "./JsonTypes.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceError } from "./WorkspaceError.js";

export class AgentHttpRequestReader {
  private readonly fieldReader = new AgentHttpFieldReader();

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
    return this.fieldReader.readRequiredString(body, key);
  }

  readOptionalNumber(body: Record<string, unknown>, key: string, fallback: number): number {
    return this.fieldReader.readOptionalNumber(body, key, fallback);
  }

  readOptionalBoolean(body: Record<string, unknown>, key: string, fallback: boolean): boolean {
    return this.fieldReader.readOptionalBoolean(body, key, fallback);
  }

  readOptionalJsonObject(body: Record<string, unknown>, key: string): JsonObject {
    return this.fieldReader.readOptionalJsonObject(body, key);
  }

  readBooleanQuery(value: string | null, fallback: boolean): boolean {
    return this.fieldReader.readBooleanQuery(value, fallback);
  }

  private readNullableInt(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

}
