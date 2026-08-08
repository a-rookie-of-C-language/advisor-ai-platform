import type { JsonObject } from "../types/JsonTypes.js";

export class JsonObjectReader {
  asObject(value: unknown): JsonObject {
    return this.isJsonObject(value) ? value : {};
  }

  isJsonObject(value: unknown): value is JsonObject {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
}
