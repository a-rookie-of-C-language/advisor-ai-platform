import { AliasedValueReader } from "../common/AliasedValueReader.js";
import type { JsonObject, JsonValue } from "../common/JsonTypes.js";
import { OpenAiToolBooleanArgumentReader } from "./OpenAiToolBooleanArgumentReader.js";
import { OpenAiToolNumberArgumentReader } from "./OpenAiToolNumberArgumentReader.js";
import { OpenAiToolStringArgumentReader } from "./OpenAiToolStringArgumentReader.js";

export class OpenAiToolArgumentReader {
  static readRequiredString(args: JsonObject, key: string): string {
    const value = this.readAliasedValue(args, key);
    return OpenAiToolStringArgumentReader.readRequired(value, key);
  }

  static readOptionalString(args: JsonObject, key: string, fallback: string): string;

  static readOptionalString(args: JsonObject, key: string, fallback: string | null): string | null;

  static readOptionalString(args: JsonObject, key: string, fallback: string | null): string | null {
    const value = this.readAliasedValue(args, key);
    return OpenAiToolStringArgumentReader.readOptional(value, fallback);
  }

  static readOptionalNumber(args: JsonObject, key: string, fallback: number): number {
    const value = this.readAliasedValue(args, key);
    return OpenAiToolNumberArgumentReader.readOptional(value, fallback);
  }

  static readOptionalBoolean(args: JsonObject, key: string, fallback: boolean): boolean;

  static readOptionalBoolean(args: JsonObject, key: string, fallback: boolean | null): boolean | null;

  static readOptionalBoolean(args: JsonObject, key: string, fallback: boolean | null): boolean | null {
    const value = this.readAliasedValue(args, key);
    return OpenAiToolBooleanArgumentReader.readOptional(value, fallback);
  }

  static readOptionalJsonObject(args: JsonObject, key: string): JsonObject | null {
    const value = this.readAliasedValue(args, key);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
  }

  static readAliasedValue(args: JsonObject, snakeKey: string): JsonValue | undefined {
    return AliasedValueReader.read(args, snakeKey) as JsonValue | undefined;
  }
}
