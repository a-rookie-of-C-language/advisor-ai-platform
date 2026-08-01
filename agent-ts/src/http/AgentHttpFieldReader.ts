import type { JsonObject } from "../common/JsonTypes.js";
import { AliasedValueReader } from "../common/AliasedValueReader.js";
import { AgentHttpBooleanFieldReader } from "./AgentHttpBooleanFieldReader.js";
import { AgentHttpNumberFieldReader } from "./AgentHttpNumberFieldReader.js";
import { WorkspaceError } from "../workspace/WorkspaceError.js";

export class AgentHttpFieldReader {
  private readonly booleanFieldReader = new AgentHttpBooleanFieldReader();
  private readonly numberFieldReader = new AgentHttpNumberFieldReader();

  readRequiredString(body: Record<string, unknown>, key: string): string {
    const value = this.readAliasedValue(body, key);
    if (typeof value !== "string" || !value) {
      throw new WorkspaceError(`缺少必填字段: ${key}`);
    }
    return value;
  }

  readOptionalNumber(body: Record<string, unknown>, key: string, fallback: number): number {
    const value = this.readAliasedValue(body, key);
    return this.numberFieldReader.read(value, key, fallback);
  }

  readOptionalBoolean(body: Record<string, unknown>, key: string, fallback: boolean): boolean {
    const value = this.readAliasedValue(body, key);
    return this.booleanFieldReader.read(value, key, fallback);
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
    return this.booleanFieldReader.readQuery(value, fallback);
  }

  private readAliasedValue(body: Record<string, unknown>, snakeKey: string): unknown {
    return AliasedValueReader.read(body, snakeKey);
  }
}
