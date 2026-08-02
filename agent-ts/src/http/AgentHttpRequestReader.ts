import type { IncomingMessage } from "node:http";
import { AgentHttpFieldReader } from "./AgentHttpFieldReader.js";
import { AgentHttpJsonObjectBodyReader } from "./body/AgentHttpJsonObjectBodyReader.js";
import type { AgentWorkspaceScope } from "../workspace/routes/AgentWorkspaceScope.js";
import { AgentWorkspaceScopeReader } from "../workspace/routes/AgentWorkspaceScopeReader.js";
import type { JsonObject } from "../common/JsonTypes.js";

export class AgentHttpRequestReader {
  private readonly bodyReader = new AgentHttpJsonObjectBodyReader();
  private readonly fieldReader = new AgentHttpFieldReader();
  private readonly workspaceScopeReader = new AgentWorkspaceScopeReader();

  readWorkspaceScope(url: URL): AgentWorkspaceScope {
    return this.workspaceScopeReader.read(url);
  }

  async readJsonObject(request: IncomingMessage): Promise<Record<string, unknown>> {
    return this.bodyReader.read(request);
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
