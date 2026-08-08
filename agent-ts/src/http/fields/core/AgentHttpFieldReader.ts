import type { JsonObject } from "../../../common/json/types/JsonTypes.js";
import { AliasedValueReader } from "../../../common/value/alias/AliasedValueReader.js";
import { AgentHttpJsonObjectFieldReader } from "../readers/object/AgentHttpJsonObjectFieldReader.js";
import { AgentHttpBooleanFieldReader } from "../readers/primitive/boolean/AgentHttpBooleanFieldReader.js";
import { AgentHttpNumberFieldReader } from "../readers/primitive/number/AgentHttpNumberFieldReader.js";
import { AgentHttpStringFieldReader } from "../readers/primitive/string/AgentHttpStringFieldReader.js";

export class AgentHttpFieldReader {
  private readonly booleanFieldReader = new AgentHttpBooleanFieldReader();
  private readonly jsonObjectFieldReader = new AgentHttpJsonObjectFieldReader();
  private readonly numberFieldReader = new AgentHttpNumberFieldReader();
  private readonly stringFieldReader = new AgentHttpStringFieldReader();

  readRequiredString(body: Record<string, unknown>, key: string): string {
    const value = this.readAliasedValue(body, key);
    return this.stringFieldReader.readRequired(value, key);
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
    return this.jsonObjectFieldReader.read(value, key);
  }

  readBooleanQuery(value: string | null, fallback: boolean): boolean {
    return this.booleanFieldReader.readQuery(value, fallback);
  }

  private readAliasedValue(body: Record<string, unknown>, snakeKey: string): unknown {
    return AliasedValueReader.read(body, snakeKey);
  }
}
