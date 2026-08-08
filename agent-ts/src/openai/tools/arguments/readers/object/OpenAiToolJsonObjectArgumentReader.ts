import type { JsonObject } from "../../../../../common/json/types/JsonTypes.js";

export class OpenAiToolJsonObjectArgumentReader {
  static readOptional(value: unknown): JsonObject | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
  }
}
