import type { JsonObject } from "../JsonTypes.js";

export class JsonObjectReader {
  asObject(value: unknown): JsonObject {
    return this.isJsonObject(value) ? value : {};
  }

  isJsonObject(value: unknown): value is JsonObject {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
}
