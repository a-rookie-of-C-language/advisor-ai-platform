import type { IncomingMessage } from "node:http";
import { AgentHttpFieldReader } from "./AgentHttpFieldReader.js";
import type { AgentWorkspaceScope } from "./AgentWorkspaceScope.js";
import { AgentWorkspaceScopeReader } from "./AgentWorkspaceScopeReader.js";
import type { JsonObject } from "./JsonTypes.js";
import { parseJsonBody } from "./HttpBodyParser.js";
import { WorkspaceError } from "./WorkspaceError.js";

export class AgentHttpRequestReader {
  private readonly fieldReader = new AgentHttpFieldReader();
  private readonly workspaceScopeReader = new AgentWorkspaceScopeReader();

  readWorkspaceScope(url: URL): AgentWorkspaceScope {
    return this.workspaceScopeReader.read(url);
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
}
